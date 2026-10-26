import type { UseCase } from "../../../../shared/application/use-case.js";
import type { UserResult } from "../dto/user.result.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import type { UserQueries } from "../ports/user-queries.js";

/** A user as the admin panel shows it, deleted or not. */
export class GetUserUseCase implements UseCase<string, UserResult> {
  constructor(private readonly queries: UserQueries) {}

  async execute(userId: string): Promise<UserResult> {
    const user = await this.queries.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  }
}
