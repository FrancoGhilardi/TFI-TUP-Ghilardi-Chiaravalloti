import type { Clock } from "../../../../shared/application/clock.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import type { UserAdministrationPolicy } from "../../domain/services/user-administration.policy.js";
import type { DeleteUserCommand } from "../dto/delete-user.command.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";

/**
 * An admin deletes a user, logically: the date and the author are recorded and the account
 * stops working; the database revokes its sessions. No admin can delete themselves, and the
 * system never runs out of active admins. Deleting a deleted user changes nothing.
 */
export class DeleteUserUseCase implements UseCase<DeleteUserCommand, void> {
  constructor(
    private readonly users: UserRepository,
    private readonly policy: UserAdministrationPolicy,
    private readonly transaction: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    await this.transaction.run(async () => {
      const user = await this.users.findById(command.userId);
      if (!user) {
        throw new UserNotFoundError();
      }
      // Already deleted: the first deletion keeps its date and author, and nothing is written,
      // since saving would still stamp updated_at in the database.
      if (user.isDeleted()) {
        return;
      }
      // Only an active admin can be the last one, so only then are the others counted, with
      // the user locked; two deletions at once are still stopped by the database trigger.
      const otherActiveAdmins = user.isActiveAdmin()
        ? await this.users.countOtherActiveAdmins(user.getId())
        : 0;
      this.policy.assertCanDelete(command.actorId, user, otherActiveAdmins);
      user.softDelete(command.actorId, this.clock.now());
      await this.users.save(user);
    });
  }
}
