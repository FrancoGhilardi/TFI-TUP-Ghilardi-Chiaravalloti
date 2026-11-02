import { Clock } from "../../../../shared/application/clock.js";
import { IdGenerator } from "../../../../shared/application/id-generator.js";
import { User } from "../../domain/entities/user.js";
import type { Session } from "../../domain/entities/session.js";
import { SessionRepository } from "../../domain/repositories/session.repository.js";
import { UserRole } from "../../domain/user-role.js";
import { Email } from "../../domain/value-objects/email.js";
import { UserName } from "../../domain/value-objects/user-name.js";
import { AuthSettings } from "../auth-settings.js";
import { type AccessToken, AccessTokenService } from "../ports/access-token-service.js";
import { RefreshTokenService } from "../ports/refresh-token-service.js";
import { SessionIssuer } from "./session-issuer.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");

class RecordingSessionRepository extends SessionRepository {
  readonly saved: Session[] = [];

  save(session: Session): Promise<void> {
    this.saved.push(session);
    return Promise.resolve();
  }

  findByTokenHash(): Promise<Session | null> {
    return Promise.reject(new Error("Not used by SessionIssuer"));
  }

  findByTokenHashForUpdate(): Promise<Session | null> {
    return Promise.reject(new Error("Not used by SessionIssuer"));
  }

  revokeAllForUser(): Promise<void> {
    return Promise.reject(new Error("Not used by SessionIssuer"));
  }

  deleteExpiredBefore(): Promise<number> {
    return Promise.reject(new Error("Not used by SessionIssuer"));
  }
}

class FakeAccessTokens extends AccessTokenService {
  issue(user: User): AccessToken {
    return { token: `access-for-${user.getId()}`, expiresInSeconds: 900 };
  }

  verify(): never {
    throw new Error("Not used by SessionIssuer");
  }
}

class FakeRefreshTokens extends RefreshTokenService {
  generate(): string {
    return "refresh-token";
  }

  hash(token: string): string {
    return `sha256:${token}`;
  }
}

class FixedClock extends Clock {
  now(): Date {
    return NOW;
  }
}

class FixedIds extends IdGenerator {
  next(): string {
    return "session-1";
  }
}

const user = User.reconstitute({
  id: "user-1",
  email: Email.create("ana@example.com"),
  name: UserName.create("Ana"),
  passwordHash: "hash",
  role: UserRole.SELLER,
  active: true,
  mustChangePassword: true,
  createdAt: NOW,
  updatedAt: NOW,
});

function setUp(refreshTokenTtlDays = 7) {
  const sessions = new RecordingSessionRepository();
  const issuer = new SessionIssuer(
    sessions,
    new FakeAccessTokens(),
    new FakeRefreshTokens(),
    new FixedIds(),
    new FixedClock(),
    new AuthSettings(refreshTokenTtlDays),
  );
  return { sessions, issuer };
}

describe("SessionIssuer", () => {
  it("returns both tokens, their lifetimes and the user", async () => {
    const { issuer } = setUp();

    await expect(issuer.issue(user)).resolves.toEqual({
      accessToken: "access-for-user-1",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token",
      refreshTokenExpiresAt: new Date("2026-10-29T12:00:00.000Z"),
      user: {
        id: "user-1",
        email: "ana@example.com",
        name: "Ana",
        role: UserRole.SELLER,
        mustChangePassword: true,
      },
    });
  });

  it("stores a session with the hash of the refresh token, never the token", async () => {
    const { sessions, issuer } = setUp();

    await issuer.issue(user, "Firefox");

    const [session] = sessions.saved;
    expect(sessions.saved).toHaveLength(1);
    expect(session?.getId()).toBe("session-1");
    expect(session?.userId).toBe("user-1");
    expect(session?.refreshTokenHash).toBe("sha256:refresh-token");
    expect(session?.createdAt).toEqual(NOW);
    expect(session?.userAgent).toBe("Firefox");
  });

  it("makes the session last the configured number of days", async () => {
    const { sessions, issuer } = setUp(30);

    const result = await issuer.issue(user);

    expect(sessions.saved[0]?.expiresAt).toEqual(new Date("2026-11-21T12:00:00.000Z"));
    expect(result.refreshTokenExpiresAt).toEqual(sessions.saved[0]?.expiresAt);
  });

  it("cuts the user agent to the 500 characters the column holds, counted in code points", async () => {
    const { sessions, issuer } = setUp();

    await issuer.issue(user, "🙂".repeat(501));

    expect(sessions.saved[0]?.userAgent).toBe("🙂".repeat(500));
  });

  it.each([undefined, ""])("stores no user agent when there is none (%o)", async (userAgent) => {
    const { sessions, issuer } = setUp();

    await issuer.issue(user, userAgent);

    expect(sessions.saved[0]?.userAgent).toBeUndefined();
  });
});
