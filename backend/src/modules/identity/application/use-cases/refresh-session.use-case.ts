import type { Clock } from "../../../../shared/application/clock.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { SessionRepository } from "../../domain/repositories/session.repository.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import type { AuthSessionResult } from "../dto/auth-session.result.js";
import type { RefreshSessionCommand } from "../dto/refresh-session.command.js";
import { InvalidSessionError } from "../errors/invalid-session-error.js";
import type { RefreshTokenService } from "../ports/refresh-token-service.js";
import type { SecurityEventLog } from "../ports/security-event-log.js";
import type { SessionIssuer } from "../services/session-issuer.js";

type Outcome =
  | { kind: "issued"; session: AuthSessionResult }
  | { kind: "reused"; userId: string }
  | { kind: "rejected" };

/**
 * Trades a refresh token for a new session and rotates the old one, so each token works once.
 * A rotated token used again may have been stolen: every session of the user is revoked. A
 * token revoked any other way (a logout, a password or role change) is only rejected, so it
 * cannot end the sessions the user started afterwards. Every failure is the same
 * `InvalidSessionError`.
 */
export class RefreshSessionUseCase implements UseCase<RefreshSessionCommand, AuthSessionResult> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenService,
    private readonly sessionIssuer: SessionIssuer,
    private readonly transaction: TransactionManager,
    private readonly clock: Clock,
    private readonly securityLog: SecurityEventLog,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<AuthSessionResult> {
    if (!command.refreshToken) {
      throw new InvalidSessionError();
    }
    const tokenHash = this.refreshTokens.hash(command.refreshToken);
    // Read without a lock to learn whose session it is: inside the transaction the user is
    // locked before the session, the same order the database trigger that revokes sessions
    // follows, so a refresh and a password change cannot deadlock.
    const found = await this.sessions.findByTokenHash(tokenHash);
    if (!found || found.isExpired(this.clock.now())) {
      throw new InvalidSessionError();
    }

    // The transaction resolves instead of throwing, so a revocation is committed before the
    // request is rejected.
    const outcome = await this.transaction.run(async (): Promise<Outcome> => {
      const user = await this.users.findById(found.userId);
      const session = await this.sessions.findByTokenHashForUpdate(tokenHash);
      // Read after the locks, which may have kept this request waiting.
      const now = this.clock.now();
      if (!session || session.isExpired(now)) {
        return { kind: "rejected" };
      }
      if (session.isRotated()) {
        await this.sessions.revokeAllForUser(session.userId, now);
        return { kind: "reused", userId: session.userId };
      }
      if (session.isRevoked()) {
        return { kind: "rejected" };
      }

      session.rotate(now);
      await this.sessions.save(session);
      if (!user?.canLogin()) {
        return { kind: "rejected" };
      }
      return {
        kind: "issued",
        session: await this.sessionIssuer.issue(user, command.userAgent, session.familyId),
      };
    });

    if (outcome.kind === "issued") {
      return outcome.session;
    }
    if (outcome.kind === "reused") {
      try {
        this.securityLog.refreshTokenReused(outcome.userId);
      } catch {
        // The sessions are already revoked; a failing log must not turn the rejection into a
        // server error that keeps the dead cookie in the browser.
      }
    }
    throw new InvalidSessionError();
  }
}
