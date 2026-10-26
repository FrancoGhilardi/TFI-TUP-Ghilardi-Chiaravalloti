import type { Page } from "../../../../shared/application/pagination.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ListUsersQuery } from "../dto/list-users.query.js";
import type { UserResult } from "../dto/user.result.js";
import type { UserQueries } from "../ports/user-queries.js";

/** A page of the users the admin panel lists, filtered, searched and sorted by name. */
export class ListUsersUseCase implements UseCase<ListUsersQuery, Page<UserResult>> {
  constructor(private readonly queries: UserQueries) {}

  execute(query: ListUsersQuery): Promise<Page<UserResult>> {
    return this.queries.findPage(query);
  }
}
