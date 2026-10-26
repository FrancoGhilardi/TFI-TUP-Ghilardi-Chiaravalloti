import type { Clock } from "../../../../shared/application/clock.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { User } from "../../domain/entities/user.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import type { UserAdministrationPolicy } from "../../domain/services/user-administration.policy.js";
import type { ResetUserPasswordCommand } from "../dto/reset-user-password.command.js";
import type { PasswordResetNotifier } from "../ports/password-reset-notifier.js";
import { loadEditableUser } from "../services/editable-user.js";
import type { TemporaryPasswordFactory } from "../services/temporary-password-factory.js";

/**
 * An admin resets another user's password: a generated temporary password replaces it, drops
 * any temporary one pending and must be changed on the next login. The database revokes the
 * user's sessions. The mail goes out with the transaction open, so if it fails nothing
 * changes and the admin can try again.
 */
export class ResetUserPasswordUseCase implements UseCase<ResetUserPasswordCommand, void> {
  constructor(
    private readonly users: UserRepository,
    private readonly temporaryPasswords: TemporaryPasswordFactory,
    private readonly notifier: PasswordResetNotifier,
    private readonly policy: UserAdministrationPolicy,
    private readonly transaction: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async execute(command: ResetUserPasswordCommand): Promise<void> {
    // Read first without a lock, so a request that cannot succeed fails before any hashing.
    await this.loadResettable(command);
    // Hashing is slow, so it runs before the transaction: no row lock is held while it does.
    const { plain, hash } = await this.temporaryPasswords.create();

    await this.transaction.run(async () => {
      const user = await this.loadResettable(command);
      user.assignTemporaryPassword(hash, command.actorId, this.clock.now());
      await this.users.save(user);
      // Inside the transaction (the one mail sent with it open): a failure rolls the reset
      // back, so the user keeps a password they know and their sessions.
      await this.notifier.sendAssignedPassword(user.email.toString(), user.name.toString(), plain);
    });
  }

  private async loadResettable(command: ResetUserPasswordCommand): Promise<User> {
    const user = await loadEditableUser(this.users, command.userId);
    this.policy.assertCanResetPassword(command.actorId, user);
    return user;
  }
}
