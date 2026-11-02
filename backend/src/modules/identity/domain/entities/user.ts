import { Entity } from "../../../../shared/domain/entity.js";
import { UserRole } from "../user-role.js";
import type { Email } from "../value-objects/email.js";
import type { TemporaryPassword } from "../value-objects/temporary-password.js";

export interface UserProps {
  id: string;
  email: Email;
  name: string;
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

/** A panel user, aggregate root of the identity module. */
export class User extends Entity {
  private constructor(private readonly props: UserProps) {
    super(props.id);
  }

  static reconstitute(props: UserProps): User {
    return new User({ ...props });
  }

  get email(): Email {
    return this.props.email;
  }

  get name(): string {
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
}
