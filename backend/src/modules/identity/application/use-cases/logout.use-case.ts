import type { Clock } from "../../../../shared/application/clock.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { SessionRepository } from "../../domain/repositories/session.repository.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import type { LogoutCommand } from "../dto/logout.command.js";
import type { RefreshTokenService } from "../ports/refresh-token-service.js";

/**
 * Ends the session of the refresh token together with its whole family: a token already spent
 * by a refresh still ends the session that replaced it, whether that refresh came from a
 * request racing the logout or from someone who stole the token. Sessions started by other
 * logins are left alone. It never fails for the token: a missing or unknown one leaves
 * nothing to end.
 */
export class LogoutUseCase implements UseCase<LogoutCommand, void> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenService,
    private readonly transaction: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    if (!command.refreshToken) {
      return;
    }
    const session = await this.sessions.findByTokenHash(
      this.refreshTokens.hash(command.refreshToken),
    );
    if (!session) {
      return;
    }

    await this.transaction.run(async () => {
      // A refresh locks the user while it replaces the session, so waiting for that lock makes
      // the session it starts visible here. It is also the order the database trigger that
      // revokes sessions follows, so the two cannot deadlock.
      await this.users.findById(session.userId);
      await this.sessions.revokeFamily(session.familyId, this.clock.now());
    });
  }
}
