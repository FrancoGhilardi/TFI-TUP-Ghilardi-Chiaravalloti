import type { Clock } from "../../../../shared/application/clock.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { User } from "../../domain/entities/user.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import type { AuthSessionResult } from "../dto/auth-session.result.js";
import type { LoginCommand } from "../dto/login.command.js";
import { InvalidCredentialsError } from "../errors/invalid-credentials-error.js";
import type { PasswordHasher } from "../ports/password-hasher.js";
import { parseEmail } from "../parse-email.js";
import type { SessionIssuer } from "../services/session-issuer.js";

/** Which stored hash the typed password matched. */
type Match = { kind: "current" | "temporary"; hash: string };

/**
 * Logs a user in with their password or with a temporary password still in force. Every
 * failure is the same `InvalidCredentialsError`, and every attempt runs exactly two password
 * checks, so neither the response nor its timing reveal whether the account exists or has a
 * temporary password pending.
 */
export class LoginUseCase implements UseCase<LoginCommand, AuthSessionResult> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessionIssuer: SessionIssuer,
    private readonly transaction: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async execute(command: LoginCommand): Promise<AuthSessionResult> {
    const email = parseEmail(command.email);
    // Hashing is slow, so it runs before the transaction: no connection or row lock is held
    // while the passwords are checked.
    const user = email && (await this.users.findByEmail(email));
    const match = await this.match(user, command.password, this.clock.now());
    // Checked after the passwords, so an inactive account takes as long as any other.
    if (!email || !user || !match || !user.canLogin()) {
      throw new InvalidCredentialsError();
    }

    return this.transaction.run(async () => {
      const now = this.clock.now();
      const locked = await this.users.findByEmail(email);
      if (!locked || !locked.canLogin() || !stillMatches(locked, user.getId(), match, now)) {
        throw new InvalidCredentialsError();
      }

      if (match.kind === "current") {
        locked.discardTemporaryPassword(now);
      } else {
        locked.consumeTemporaryPassword(now);
      }
      locked.recordLogin(now);
      await this.users.save(locked);

      // After saving: changing the password revokes the user's sessions in the database.
      return this.sessionIssuer.issue(locked, command.userAgent);
    });
  }

  // Both checks always run, against the decoy when there is no hash to compare with.
  private async match(user: User | null, password: string, now: Date): Promise<Match | null> {
    const temporary = user?.hasUsableTemporaryPassword(now) ? user.temporaryPassword : undefined;
    const current = user
      ? await this.hasher.verify(user.passwordHash, password)
      : await this.hasher.verifyAgainstNothing(password);
    const viaTemporary = temporary
      ? await this.hasher.verify(temporary.hash, password)
      : await this.hasher.verifyAgainstNothing(password);

    if (user && current) {
      return { kind: "current", hash: user.passwordHash };
    }
    if (temporary && viaTemporary) {
      return { kind: "temporary", hash: temporary.hash };
    }
    return null;
  }
}

/**
 * The passwords were checked outside the transaction; this makes sure the locked row is the
 * same user and still holds the hash that matched, in case it changed in between.
 */
function stillMatches(user: User, expectedId: string, match: Match, now: Date): boolean {
  if (user.getId() !== expectedId) {
    return false;
  }
  if (match.kind === "current") {
    return user.passwordHash === match.hash;
  }
  return user.hasUsableTemporaryPassword(now) && user.temporaryPassword?.hash === match.hash;
}
