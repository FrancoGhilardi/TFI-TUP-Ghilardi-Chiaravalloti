import type { Clock } from "../../../../shared/application/clock.js";
import type { IdGenerator } from "../../../../shared/application/id-generator.js";
import type { User } from "../../domain/entities/user.js";
import { Session } from "../../domain/entities/session.js";
import type { SessionRepository } from "../../domain/repositories/session.repository.js";
import type { AuthSettings } from "../auth-settings.js";
import { toAuthenticatedUserResult } from "../dto/authenticated-user.result.js";
import type { AuthSessionResult } from "../dto/auth-session.result.js";
import type { AccessTokenService } from "../ports/access-token-service.js";
import type { RefreshTokenService } from "../ports/refresh-token-service.js";

const DAY_MS = 86_400_000;
// Length of the sessions.user_agent column, counted in characters like Postgres does.
const MAX_USER_AGENT_LENGTH = 500;

/**
 * Starts a session for a user who just proved who they are, and issues both tokens. A session
 * that replaces another one keeps its family; otherwise a new family starts.
 */
export class SessionIssuer {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly settings: AuthSettings,
  ) {}

  async issue(user: User, userAgent?: string, familyId?: string): Promise<AuthSessionResult> {
    const now = this.clock.now();
    const refreshToken = this.refreshTokens.generate();
    const session = Session.start({
      id: this.ids.next(),
      userId: user.getId(),
      refreshTokenHash: this.refreshTokens.hash(refreshToken),
      familyId,
      expiresAt: new Date(now.getTime() + this.settings.refreshTokenTtlDays * DAY_MS),
      userAgent: truncate(userAgent),
      now,
    });
    await this.sessions.save(session);

    const accessToken = this.accessTokens.issue(user);
    return {
      accessToken: accessToken.token,
      accessTokenExpiresIn: accessToken.expiresInSeconds,
      refreshToken,
      refreshTokenExpiresAt: session.expiresAt,
      user: toAuthenticatedUserResult(user),
    };
  }
}

function truncate(userAgent: string | undefined): string | undefined {
  if (!userAgent) {
    return undefined;
  }
  return Array.from(userAgent).slice(0, MAX_USER_AGENT_LENGTH).join("");
}
