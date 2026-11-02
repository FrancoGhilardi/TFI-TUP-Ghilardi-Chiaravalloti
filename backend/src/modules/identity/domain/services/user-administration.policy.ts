import type { User } from "../entities/user.js";
import { LastActiveAdminError } from "../errors/last-active-admin-error.js";
import {
  type SelfAdministrationAction,
  SelfAdministrationError,
} from "../errors/self-administration-error.js";
import { UserRole } from "../user-role.js";

/**
 * Rules that involve more than one user. An admin cannot take away their own role, status
 * or account, and no change may leave the system without an active admin. The caller passes
 * how many other active admins exist, so the policy stays free of any repository.
 *
 * A change that leaves the target as it was is always allowed, like in `User`.
 */
export class UserAdministrationPolicy {
  assertCanChangeRole(
    actorId: string,
    target: User,
    newRole: UserRole,
    otherActiveAdmins: number,
  ): void {
    if (newRole === target.role) {
      return;
    }
    this.assertNotSelf(actorId, target, "changeRole");
    if (newRole !== UserRole.ADMIN) {
      this.assertAnotherActiveAdminRemains(target, otherActiveAdmins);
    }
  }

  assertCanDeactivate(actorId: string, target: User, otherActiveAdmins: number): void {
    if (!target.active) {
      return;
    }
    this.assertNotSelf(actorId, target, "deactivate");
    this.assertAnotherActiveAdminRemains(target, otherActiveAdmins);
  }

  assertCanDelete(actorId: string, target: User, otherActiveAdmins: number): void {
    if (target.isDeleted()) {
      return;
    }
    this.assertNotSelf(actorId, target, "delete");
    this.assertAnotherActiveAdminRemains(target, otherActiveAdmins);
  }

  /** An admin changes their own password with change-password, never with a reset. */
  assertCanResetPassword(actorId: string, target: User): void {
    this.assertNotSelf(actorId, target, "resetPassword");
  }

  private assertNotSelf(actorId: string, target: User, action: SelfAdministrationAction): void {
    if (actorId === target.getId()) {
      throw new SelfAdministrationError(action);
    }
  }

  private assertAnotherActiveAdminRemains(target: User, otherActiveAdmins: number): void {
    if (target.isActiveAdmin() && otherActiveAdmins === 0) {
      throw new LastActiveAdminError();
    }
  }
}
