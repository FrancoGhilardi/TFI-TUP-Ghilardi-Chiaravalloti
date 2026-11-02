import { Entity } from "../../../../shared/domain/entity.js";
import { DeletedUserError } from "../errors/deleted-user-error.js";
import { TemporaryPasswordUnavailableError } from "../errors/temporary-password-unavailable-error.js";
import { UserNotDeletedError } from "../errors/user-not-deleted-error.js";
import { UserRole } from "../user-role.js";
import type { Email } from "../value-objects/email.js";
import type { TemporaryPassword } from "../value-objects/temporary-password.js";
import type { UserName } from "../value-objects/user-name.js";

export interface UserProps {
  id: string;
  email: Email;
  name: UserName;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  mustChangePassword: boolean;
  temporaryPassword?: TemporaryPassword;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface NewUserProps {
  id: string;
  email: Email;
  name: UserName;
  /** Hash of the temporary password given by the admin who creates the user. */
  passwordHash: string;
  role: UserRole;
  /** Absent only for the first admin, created by the seed. */
  createdBy?: string;
  now: Date;
}

/**
 * A panel user, aggregate root of the identity module. Every change goes through its
 * methods, which keep the audit fields up to date. A deleted user can only be restored, and
 * a change that leaves everything as it was does nothing, so retrying an action never fails.
 */
export class User extends Entity {
  private constructor(private readonly props: UserProps) {
    super(props.id);
  }

  /** A new user is active and must replace the temporary password it was given. */
  static create(input: NewUserProps): User {
    return new User({
      id: input.id,
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      role: input.role,
      active: true,
      mustChangePassword: true,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstitute(props: UserProps): User {
    return new User({ ...props });
  }

  get email(): Email {
    return this.props.email;
  }

  get name(): UserName {
    return this.props.name;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get active(): boolean {
    return this.props.active;
  }

  get mustChangePassword(): boolean {
    return this.props.mustChangePassword;
  }

  get temporaryPassword(): TemporaryPassword | undefined {
    return this.props.temporaryPassword;
  }

  get passwordChangedAt(): Date | undefined {
    return this.props.passwordChangedAt;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  get createdBy(): string | undefined {
    return this.props.createdBy;
  }

  get updatedBy(): string | undefined {
    return this.props.updatedBy;
  }

  get deletedBy(): string | undefined {
    return this.props.deletedBy;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  isAdmin(): boolean {
    return this.props.role === UserRole.ADMIN;
  }

  isDeleted(): boolean {
    return this.props.deletedAt !== undefined;
  }

  canLogin(): boolean {
    return this.props.active && !this.isDeleted();
  }

  isActiveAdmin(): boolean {
    return this.isAdmin() && this.canLogin();
  }

  rename(name: UserName, actorId: string, now: Date): void {
    this.assertNotDeleted();
    if (name.equals(this.props.name)) {
      return;
    }
    this.props.name = name;
    this.touch(actorId, now);
  }

  changeEmail(email: Email, actorId: string, now: Date): void {
    this.assertNotDeleted();
    if (email.equals(this.props.email)) {
      return;
    }
    this.props.email = email;
    this.touch(actorId, now);
  }

  /** Rules involving other users (own role, last admin) live in UserAdministrationPolicy. */
  changeRole(role: UserRole, actorId: string, now: Date): void {
    this.assertNotDeleted();
    if (role === this.props.role) {
      return;
    }
    this.props.role = role;
    this.touch(actorId, now);
  }

  activate(actorId: string, now: Date): void {
    this.setActive(true, actorId, now);
  }

  deactivate(actorId: string, now: Date): void {
    this.setActive(false, actorId, now);
  }

  /**
   * An admin creates or resets the user's password: it replaces the current one, must be
   * changed on the next login and discards any temporary password from the forgot flow.
   */
  assignTemporaryPassword(passwordHash: string, actorId: string, now: Date): void {
    this.assertNotDeleted();
    this.replacePassword(passwordHash, true, now);
    this.touch(actorId, now);
  }

  /**
   * Forgot flow, asked for by the user: the temporary password lives alongside the current
   * one, which still works.
   */
  issueTemporaryPassword(temporary: TemporaryPassword, now: Date): void {
    this.assertNotDeleted();
    this.props.temporaryPassword = temporary;
    this.touch(this.getId(), now);
  }

  hasUsableTemporaryPassword(now: Date): boolean {
    return (
      this.props.temporaryPassword !== undefined && !this.props.temporaryPassword.isExpired(now)
    );
  }

  /** Logging in with the temporary password makes it the password, once, until changed. */
  consumeTemporaryPassword(now: Date): void {
    this.assertNotDeleted();
    const temporary = this.props.temporaryPassword;
    if (temporary === undefined || temporary.isExpired(now)) {
      throw new TemporaryPasswordUnavailableError();
    }
    this.replacePassword(temporary.hash, true, now);
    this.touch(this.getId(), now);
  }

  discardTemporaryPassword(now: Date): void {
    this.assertNotDeleted();
    if (this.props.temporaryPassword === undefined) {
      return;
    }
    this.props.temporaryPassword = undefined;
    this.touch(undefined, now);
  }

  /** The user sets a password of their own, which ends any pending change. */
  changePassword(newPasswordHash: string, now: Date): void {
    this.assertNotDeleted();
    this.replacePassword(newPasswordHash, false, now);
    this.touch(this.getId(), now);
  }

  /**
   * A login is not a change to the user's data, so the audit fields stay as they were in
   * memory (the database trigger still sets updated_at when the row is saved).
   */
  recordLogin(now: Date): void {
    this.assertNotDeleted();
    this.props.lastLoginAt = now;
  }

  /** Deletion is always logical; there is no way to remove a user for good. */
  softDelete(actorId: string, now: Date): void {
    if (this.isDeleted()) {
      return;
    }
    this.props.deletedAt = now;
    this.props.deletedBy = actorId;
    this.props.active = false;
    this.touch(actorId, now);
  }

  /**
   * The email may have been taken by another user while this one was deleted; the caller
   * must check it with `UserRepository.existsByEmail` before restoring.
   */
  restore(actorId: string, now: Date): void {
    if (!this.isDeleted()) {
      throw new UserNotDeletedError();
    }
    this.props.deletedAt = undefined;
    this.props.deletedBy = undefined;
    this.props.active = true;
    this.touch(actorId, now);
  }

  /** Every new password drops the temporary one and invalidates older access tokens. */
  private replacePassword(passwordHash: string, mustChangePassword: boolean, now: Date): void {
    this.props.passwordHash = passwordHash;
    this.props.mustChangePassword = mustChangePassword;
    this.props.temporaryPassword = undefined;
    this.props.passwordChangedAt = now;
  }

  private setActive(active: boolean, actorId: string, now: Date): void {
    this.assertNotDeleted();
    if (active === this.props.active) {
      return;
    }
    this.props.active = active;
    this.touch(actorId, now);
  }

  private assertNotDeleted(): void {
    if (this.isDeleted()) {
      throw new DeletedUserError();
    }
  }

  /**
   * Records who changed the user and when, in memory. Changes the user makes on their own
   * account pass their own id; only a change with no known author passes none. Once saved,
   * the database trigger sets updated_at again on every write, with its own clock.
   */
  private touch(actorId: string | undefined, now: Date): void {
    if (actorId !== undefined) {
      this.props.updatedBy = actorId;
    }
    this.props.updatedAt = now;
  }
}
