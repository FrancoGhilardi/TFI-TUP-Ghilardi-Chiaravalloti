import { Clock } from "../../../../shared/application/clock.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { Session, type SessionProps } from "../../domain/entities/session.js";
import type { User } from "../../domain/entities/user.js";
import { SessionRepository } from "../../domain/repositories/session.repository.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { RefreshTokenService } from "../ports/refresh-token-service.js";
import { LogoutUseCase } from "./logout.use-case.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const EARLIER = new Date("2026-10-20T12:00:00.000Z");
const IN_A_WEEK = new Date("2026-10-29T12:00:00.000Z");

class InMemorySessionRepository extends SessionRepository {
  readonly rows: SessionProps[] = [];

  constructor(
    private readonly events: string[],
    private readonly failure?: Error,
  ) {
    super();
  }

  findByTokenHash(tokenHash: string): Promise<Session | null> {
    this.events.push(`find session ${tokenHash}`);
    const row = this.rows.find((stored) => stored.refreshTokenHash === tokenHash);
    return Promise.resolve(row ? Session.reconstitute({ ...row }) : null);
  }

  revokeFamily(familyId: string, now: Date): Promise<void> {
    this.events.push(`revoke family ${familyId}`);
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    for (const row of this.rows) {
      if (row.familyId === familyId) {
        row.revokedAt ??= now;
      }
    }
    return Promise.resolve();
  }

  save(): Promise<void> {
    return this.unused();
  }

  findByTokenHashForUpdate(): Promise<Session | null> {
    return this.unused();
  }

  revokeAllForUser(): Promise<void> {
    return this.unused();
  }

  deleteExpiredBefore(): Promise<number> {
    return this.unused();
  }

  revokedAt(id: string): Date | undefined {
    return this.rows.find((row) => row.id === id)?.revokedAt;
  }

  private unused(): Promise<never> {
    return Promise.reject(new Error("Not used by LogoutUseCase"));
  }
}

class RecordingUserRepository extends UserRepository {
  constructor(private readonly events: string[]) {
    super();
  }

  findById(id: string): Promise<User | null> {
    this.events.push(`find user ${id}`);
    return Promise.resolve(null);
  }

  findByEmail(): Promise<User | null> {
    return this.unused();
  }

  existsByEmail(): Promise<boolean> {
    return this.unused();
  }

  countOtherActiveAdmins(): Promise<number> {
    return this.unused();
  }

  save(): Promise<void> {
    return this.unused();
  }

  private unused(): Promise<never> {
    return Promise.reject(new Error("Not used by LogoutUseCase"));
  }
}

class FakeRefreshTokens extends RefreshTokenService {
  generate(): string {
    return "new-token";
  }

  hash(token: string): string {
    return `hash:${token}`;
  }
}

class RecordingTransaction extends TransactionManager {
  constructor(private readonly events: string[]) {
    super();
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    this.events.push("begin");
    try {
      const result = await work();
      this.events.push("commit");
      return result;
    } catch (error) {
      this.events.push("rollback");
      throw error;
    }
  }
}

/** Records when it is read, to check the order against the lock. */
class RecordingClock extends Clock {
  constructor(private readonly events: string[]) {
    super();
  }

  now(): Date {
    this.events.push("read clock");
    return NOW;
  }
}

function session(overrides: Partial<SessionProps> = {}): SessionProps {
  return {
    id: "session-1",
    userId: "user-1",
    refreshTokenHash: "hash:old-token",
    familyId: "family-1",
    expiresAt: IN_A_WEEK,
    createdAt: EARLIER,
    ...overrides,
  };
}

/** The session that replaced session-1 through a refresh. */
const replacement = (overrides: Partial<SessionProps> = {}) =>
  session({ id: "session-2", refreshTokenHash: "hash:new-token", ...overrides });

/** A session of the same user started by another login. */
const otherLogin = () =>
  session({ id: "session-3", refreshTokenHash: "hash:other", familyId: "family-2" });

function setUp(options: { sessions?: SessionProps[]; failure?: Error } = {}) {
  const events: string[] = [];
  const sessions = new InMemorySessionRepository(events, options.failure);
  sessions.rows.push(...(options.sessions ?? [session()]));
  const useCase = new LogoutUseCase(
    sessions,
    new RecordingUserRepository(events),
    new FakeRefreshTokens(),
    new RecordingTransaction(events),
    new RecordingClock(events),
  );
  const logout = (refreshToken?: string) => useCase.execute({ refreshToken });
  return { events, sessions, logout };
}

describe("LogoutUseCase", () => {
  it("revokes the family of the token after locking the user, then reads the time", async () => {
    const { events, sessions, logout } = setUp();

    await logout("old-token");

    expect(sessions.revokedAt("session-1")).toEqual(NOW);
    expect(events).toEqual([
      "find session hash:old-token",
      "begin",
      "find user user-1",
      "read clock",
      "revoke family family-1",
      "commit",
    ]);
  });

  it("ends the session that replaced a token already spent by a refresh", async () => {
    const { sessions, logout } = setUp({
      sessions: [session({ revokedAt: EARLIER, rotatedAt: EARLIER }), replacement()],
    });

    await logout("old-token");

    expect(sessions.revokedAt("session-2")).toEqual(NOW);
    expect(sessions.revokedAt("session-1")).toEqual(EARLIER);
  });

  it("leaves the sessions of other logins alone", async () => {
    const { sessions, logout } = setUp({ sessions: [session(), otherLogin()] });

    await logout("old-token");

    expect(sessions.revokedAt("session-3")).toBeUndefined();
  });

  it("revokes an expired session that was never revoked", async () => {
    const { sessions, logout } = setUp({
      sessions: [session({ expiresAt: EARLIER, createdAt: new Date("2026-10-01T00:00:00.000Z") })],
    });

    await logout("old-token");

    expect(sessions.revokedAt("session-1")).toEqual(NOW);
  });

  describe("is idempotent", () => {
    it("keeps when the family ended when the same token logs out again", async () => {
      const { sessions, logout } = setUp({
        sessions: [session({ revokedAt: EARLIER }), replacement({ revokedAt: EARLIER })],
      });

      await expect(logout("old-token")).resolves.toBeUndefined();

      expect(sessions.revokedAt("session-1")).toEqual(EARLIER);
      expect(sessions.revokedAt("session-2")).toEqual(EARLIER);
    });

    it.each([
      ["without a token", undefined],
      ["with an empty token", ""],
    ])("ends %s before reading anything", async (_label, token) => {
      const { events, logout } = setUp();

      await expect(logout(token)).resolves.toBeUndefined();

      expect(events).toEqual([]);
    });

    it("ends with an unknown token without opening a transaction", async () => {
      const { events, logout } = setUp();

      await expect(logout("unknown")).resolves.toBeUndefined();

      expect(events).toEqual(["find session hash:unknown"]);
    });
  });

  it("lets a failure of the repository through, without committing", async () => {
    const failure = new Error("database down");
    const { events, logout } = setUp({ failure });

    await expect(logout("old-token")).rejects.toBe(failure);

    expect(events.at(-1)).toBe("rollback");
  });
});
