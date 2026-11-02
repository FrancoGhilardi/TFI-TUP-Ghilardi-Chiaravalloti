import type { Page } from "../../../../shared/application/pagination.js";
import type { ListUsersQuery } from "../dto/list-users.query.js";
import type { UserResult } from "../dto/user.result.js";

/** Reads users for the admin panel, without loading entities. */
export abstract class UserQueries {
  abstract findPage(query: ListUsersQuery): Promise<Page<UserResult>>;

  /** The user with that id, deleted or not, or `null`. */
  abstract findById(id: string): Promise<UserResult | null>;
}
