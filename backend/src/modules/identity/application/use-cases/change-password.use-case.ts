import type { Clock } from "../../../../shared/application/clock.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { User } from "../../domain/entities/user.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import { Password } from "../../domain/value-objects/password.js";
import type { AuthSessionResult } from "../dto/auth-session.result.js";
import type { ChangePasswordCommand } from "../dto/change-password.command.js";
import { InvalidAccessTokenError } from "../errors/invalid-access-token-error.js";
import { InvalidCurrentPasswordError } from "../errors/invalid-current-password-error.js";
import { PasswordUnchangedError } from "../errors/password-unchanged-error.js";
import type { PasswordHasher } from "../ports/password-hasher.js";
import type { SessionIssuer } from "../services/session-issuer.js";

/**
 * The authenticated user sets a password of their own, which ends a pending change and drops
 * any temporary password. The database revokes every session of the user when the password
 * changes, so a new one is started for the device that made the change.
 */
export class ChangePasswordUseCase implements UseCase<ChangePasswordCommand, AuthSessionResult> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessionIssuer: SessionIssuer,
    private readonly transaction: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<AuthSessionResult> {
    const newPassword = Password.create(command.newPassword);
    // Hashing is slow, so it runs before the transaction: no connection or row lock is held
    // while the passwords are checked.
    const user = usable(await this.users.findById(command.userId));
    const verifiedHash = user.passwordHash;
    if (!(await this.hasher.verify(verifiedHash, command.currentPassword))) {
      throw new InvalidCurrentPasswordError();
    }
    // The current password matches the stored hash, so comparing the texts is enough.
    if (newPassword.reveal() === command.currentPassword) {
      throw new PasswordUnchangedError();
    }
    const newHash = await this.hasher.hash(newPassword);

    return this.transaction.run(async () => {
      const locked = usable(await this.users.findById(command.userId));
      const now = this.clock.now();
      // The password was checked against this hash; if it changed meanwhile, the current
      // password typed is no longer known to be right.
      if (locked.passwordHash !== verifiedHash) {
        throw new InvalidCurrentPasswordError();
      }
      locked.changePassword(newHash, now);
      await this.users.save(locked);

      // After saving: changing the password revokes the user's sessions in the database.
      return this.sessionIssuer.issue(locked, command.userAgent);
    });
  }
}

/** A user deactivated or deleted after the access token was checked can no longer use it. */
function usable(user: User | null): User {
  if (!user?.canLogin()) {
    throw new InvalidAccessTokenError();
  }
  return user;
}
