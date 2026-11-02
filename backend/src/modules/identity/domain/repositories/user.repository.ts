import type { User } from "../entities/user.js";
import type { Email } from "../value-objects/email.js";

/**
 * Loads and stores users. "Current" users are the ones not deleted, the same set the unique
 * email index covers.
 */
export abstract class UserRepository {
  /** Returns the user with that id, deleted or not, or `null` if there is none. */
  abstract findById(id: string): Promise<User | null>;

  /** Returns the current user with that email, ignoring case, or `null`. */
  abstract findByEmail(email: Email): Promise<User | null>;

  /**
   * Whether a current user other than `excludeId` already has that email, ignoring case.
   * Checked before creating a user, changing an email and restoring a deleted user.
   */
  abstract existsByEmail(email: Email, excludeId?: string): Promise<boolean>;

  /** Active, current admins other than `excludeId`, for the last-admin rule. */
  abstract countOtherActiveAdmins(excludeId: string): Promise<number>;

  /** Stores a new user or the changes of an existing one. */
  abstract save(user: User): Promise<void>;
}
