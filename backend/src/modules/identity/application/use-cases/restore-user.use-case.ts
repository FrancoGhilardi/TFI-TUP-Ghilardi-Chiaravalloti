import type { Clock } from "../../../../shared/application/clock.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import { EmailAlreadyInUseError } from "../../domain/errors/email-already-in-use-error.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import type { RestoreUserCommand } from "../dto/restore-user.command.js";
import type { UserResult } from "../dto/user.result.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import type { UserQueries } from "../ports/user-queries.js";

/**
 * An admin restores a deleted user: the deletion is cleared and the account is active again,
 * with its password and pending change as they were. Its email may have gone to another user
 * meanwhile, which stops the restore.
 */
export class RestoreUserUseCase implements UseCase<RestoreUserCommand, UserResult> {
  constructor(
    private readonly users: UserRepository,
    private readonly queries: UserQueries,
    private readonly transaction: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async execute(command: RestoreUserCommand): Promise<UserResult> {
    await this.transaction.run(async () => {
      const user = await this.users.findById(command.userId);
      if (!user) {
        throw new UserNotFoundError();
      }
      // Refuses a user that is not deleted; a later failure rolls the change back.
      user.restore(command.actorId, this.clock.now());
      // Two restores or a creation at once with that email are stopped by the unique index,
      // which the repository reports as the same error.
      if (await this.users.existsByEmail(user.email, user.getId())) {
        throw new EmailAlreadyInUseError();
      }
      await this.users.save(user);
    });

    const restored = await this.queries.findById(command.userId);
    if (!restored) {
      throw new UserNotFoundError();
    }
    return restored;
  }
}
