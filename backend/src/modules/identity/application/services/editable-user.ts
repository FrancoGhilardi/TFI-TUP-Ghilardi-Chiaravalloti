import type { User } from "../../domain/entities/user.js";
import { DeletedUserError } from "../../domain/errors/deleted-user-error.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";

/**
 * The user an admin is about to change: an unknown one is a 404, and a deleted one can only
 * be restored, never changed (D67). Inside a transaction the row stays locked.
 */
export async function loadEditableUser(users: UserRepository, id: string): Promise<User> {
  const user = await users.findById(id);
  if (!user) {
    throw new UserNotFoundError();
  }
  if (user.isDeleted()) {
    throw new DeletedUserError();
  }
  return user;
}
