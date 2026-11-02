import type { User } from "../entities/user.js";

/** Loads and stores users. */
export abstract class UserRepository {
  /** Returns the user with that id, deleted or not, or `null` if there is none. */
  abstract findById(id: string): Promise<User | null>;
}
