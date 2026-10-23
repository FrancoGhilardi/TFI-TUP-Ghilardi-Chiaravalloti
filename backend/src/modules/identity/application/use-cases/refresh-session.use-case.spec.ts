import { Clock } from "../../../../shared/application/clock.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { Session, type SessionProps } from "../../domain/entities/session.js";
import { User, type UserProps } from "../../domain/entities/user.js";
import { SessionRepository } from "../../domain/repositories/session.repository.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { UserRole } from "../../domain/user-role.js";
import { Email } from "../../domain/value-objects/email.js";
import { UserName } from "../../domain/value-objects/user-name.js";
import type { AuthSessionResult } from "../dto/auth-session.result.js";
import { InvalidSessionError } from "../errors/invalid-session-error.js";
import { RefreshTokenService } from "../ports/refresh-token-service.js";
import { SecurityEventLog } from "../ports/security-event-log.js";
import type { SessionIssuer } from "../services/session-issuer.js";
import { RefreshSessionUseCase } from "./refresh-session.use-case.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const EARLIER = new Date("2026-10-20T12:00:00.000Z");
const IN_A_WEEK = new Date("2026-10-29T12:00:00.000Z");

/** Stores copies, like a database: an entity read twice is two different objects. */
class InMemorySessionRepository extends SessionRepository {
  readonly rows: SessionProps[] = [];

  constructor(
    private readonly events: string[],
    // Lets a test change the stored sessions between the first read and the locked one.
    private readonly beforeLockedRead?: (rows: SessionProps[]) => void,
  ) {
    super();
  }

  findByTokenHash(tokenHash: string): Promise<Session | null> {
    this.events.push(`find session ${tokenHash}`);
    return Promise.resolve(this.copyOf(tokenHash));
  }

  findByTokenHashForUpdate(tokenHash: string): Promise<Session | null> {
    this.beforeLockedRead?.(this.rows);
    this.events.push(`lock session ${tokenHash}`);
    return Promise.resolve(this.copyOf(tokenHash));
  }

  save(session: Session): Promise<void> {
    this.events.push(`save session ${session.getId()}`);
    const row = this.rows.find((stored) => stored.id === session.getId());
    if (row) {
      row.revokedAt ??= session.revokedAt;
      row.rotatedAt ??= session.rotatedAt;
    }
    return Promise.resolve();
  }

  revokeAllForUser(userId: string, now: Date): Promise<void> {
    this.events.push(`revoke all ${userId}`);
    for (const row of this.rows) {
      if (row.userId === userId) {
        row.revokedAt ??= now;
      }
    }
    return Promise.resolve();
  }

  deleteExpiredBefore(): Promise<number> {
    return Promise.reject(new Error("Not used by RefreshSessionUseCase"));
  }

  revokedAt(id: string): Date | undefined {
    return this.rows.find((row) => row.id === id)?.revokedAt;
  }

  rotatedAt(id: string): Date | undefined {
    return this.rows.find((row) => row.id === id)?.rotatedAt;
  }

  private copyOf(tokenHash: string): Session | null {
    const row = this.rows.find((stored) => stored.refreshTokenHash === tokenHash);
    return row ? Session.reconstitute({ ...row }) : null;
  }
}

class InMemoryUserRepository extends UserRepository {
  constructor(
    private readonly users: User[],
    private readonly events: string[],
  ) {
    super();
  }

  findById(id: string): Promise<User | null> {
    this.events.push(`find user ${id}`);
    return Promise.resolve(this.users.find((user) => user.getId() === id) ?? null);
  }

  save(user: User): Promise<void> {
    this.events.push(`save user ${user.getId()}`);
    return Promise.resolve();
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

  private unused(): Promise<never> {
    return Promise.reject(new Error("Not used by RefreshSessionUseCase"));
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

class FakeSessionIssuer {
  readonly issued: { user: User; userAgent?: string }[] = [];

  constructor(private readonly events: string[]) {}

  issue(user: User, userAgent?: string): Promise<AuthSessionResult> {
    this.events.push(`issue session ${user.getId()}`);
    this.issued.push({ user, userAgent });
    return Promise.resolve({
      accessToken: "access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "new-token",
      refreshTokenExpiresAt: IN_A_WEEK,
      user: {
        id: user.getId(),
        email: user.email.toString(),
        name: user.name.toString(),
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
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

class FixedClock extends Clock {
  now(): Date {
    return NOW;
  }
}

/** Records when it is read, to check the order against the locks. */
class RecordingClock extends Clock {
  constructor(private readonly events: string[]) {
    super();
  }

  now(): Date {
    this.events.push("read clock");
    return NOW;
  }
}

/** Returns each time in turn, then keeps the last one. */
class SteppingClock extends Clock {
  constructor(private readonly times: Date[]) {
    super();
  }

  now(): Date {
    return (this.times.length > 1 ? this.times.shift() : this.times[0]) ?? NOW;
  }
}

class RecordingSecurityLog extends SecurityEventLog {
  readonly reused: string[] = [];

  constructor(private readonly fails = false) {
    super();
  }

  refreshTokenReused(userId: string): void {
    this.reused.push(userId);
    if (this.fails) {
      throw new Error("log transport down");
    }
  }
}

function user(overrides: Partial<UserProps> = {}): User {
  return User.reconstitute({
    id: "user-1",
    email: Email.create("ana@example.com"),
    name: UserName.create("Ana"),
    passwordHash: "hash",
    role: UserRole.SELLER,
    active: true,
    mustChangePassword: false,
    createdAt: EARLIER,
    updatedAt: EARLIER,
    ...overrides,
  });
}

function session(overrides: Partial<SessionProps> = {}): SessionProps {
  return {
    id: "session-1",
    userId: "user-1",
    refreshTokenHash: "hash:old-token",
    expiresAt: IN_A_WEEK,
    createdAt: EARLIER,
    ...overrides,
  };
}

function setUp(
  options: {
    users?: User[];
    sessions?: SessionProps[];
    beforeLockedRead?: (rows: SessionProps[]) => void;
    clock?: (events: string[]) => Clock;
    failingLog?: boolean;
  } = {},
) {
  const events: string[] = [];
  const sessions = new InMemorySessionRepository(events, options.beforeLockedRead);
  sessions.rows.push(...(options.sessions ?? [session()]));
  const sessionIssuer = new FakeSessionIssuer(events);
  const securityLog = new RecordingSecurityLog(options.failingLog);
  const useCase = new RefreshSessionUseCase(
    sessions,
    new InMemoryUserRepository(options.users ?? [user()], events),
    new FakeRefreshTokens(),
    sessionIssuer as unknown as SessionIssuer,
    new RecordingTransaction(events),
    options.clock?.(events) ?? new FixedClock(),
    securityLog,
  );
  const refresh = (refreshToken?: string, userAgent?: string) =>
    useCase.execute({ refreshToken, userAgent });
  return { events, sessions, sessionIssuer, securityLog, refresh };
}

describe("RefreshSessionUseCase", () => {
  describe("with a valid token", () => {
    it("revokes the old session and starts a new one with the current user agent", async () => {
      const ana = user();
      const { sessions, sessionIssuer, refresh } = setUp({ users: [ana] });

      const result = await refresh("old-token", "Firefox");

      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toBe("new-token");
      expect(sessions.revokedAt("session-1")).toEqual(NOW);
      expect(sessionIssuer.issued).toEqual([{ user: ana, userAgent: "Firefox" }]);
    });

    it("renews the session of a user who still has to change their password", async () => {
      const { sessionIssuer, refresh } = setUp({ users: [user({ mustChangePassword: true })] });

      await refresh("old-token");

      expect(sessionIssuer.issued).toHaveLength(1);
    });

    it("locks the user before the session, and neither saves the user nor records a login", async () => {
      const { events, refresh } = setUp();

      await refresh("old-token");

      expect(events).toEqual([
        "find session hash:old-token",
        "begin",
        "find user user-1",
        "lock session hash:old-token",
        "save session session-1",
        "issue session user-1",
        "commit",
      ]);
    });

    it("reads the time after the locks, which may have kept it waiting", async () => {
      const { events, refresh } = setUp({ clock: (recorded) => new RecordingClock(recorded) });

      await refresh("old-token");

      expect(events.slice(0, 6)).toEqual([
        "find session hash:old-token",
        "read clock",
        "begin",
        "find user user-1",
        "lock session hash:old-token",
        "read clock",
      ]);
    });

    it("marks the old session as rotated, not just revoked", async () => {
      const { sessions, refresh } = setUp();

      await refresh("old-token");

      expect(sessions.rotatedAt("session-1")).toEqual(NOW);
    });

    it("leaves the other sessions of the user alone", async () => {
      const { sessions, refresh } = setUp({
        sessions: [session(), session({ id: "session-2", refreshTokenHash: "hash:other" })],
      });

      await refresh("old-token");

      expect(sessions.revokedAt("session-2")).toBeUndefined();
    });
  });

  describe("with a token used twice", () => {
    it("rejects the second use and revokes every session of the user", async () => {
      const { sessions, securityLog, refresh } = setUp({
        sessions: [session(), session({ id: "session-2", refreshTokenHash: "hash:other" })],
      });
      await refresh("old-token");

      await expect(refresh("old-token")).rejects.toThrow(InvalidSessionError);

      expect(sessions.revokedAt("session-2")).toEqual(NOW);
      expect(securityLog.reused).toEqual(["user-1"]);
    });

    it("commits the revocation before rejecting", async () => {
      const { events, refresh } = setUp({
        sessions: [session({ revokedAt: EARLIER, rotatedAt: EARLIER })],
      });

      await expect(refresh("old-token")).rejects.toThrow(InvalidSessionError);

      expect(events.slice(-2)).toEqual(["revoke all user-1", "commit"]);
      expect(events).not.toContain("rollback");
    });

    it("still rejects when the security log fails", async () => {
      const { sessions, securityLog, refresh } = setUp({
        sessions: [
          session({ revokedAt: EARLIER, rotatedAt: EARLIER }),
          session({ id: "session-2", refreshTokenHash: "hash:other" }),
        ],
        failingLog: true,
      });

      await expect(refresh("old-token")).rejects.toThrow(InvalidSessionError);

      expect(securityLog.reused).toEqual(["user-1"]);
      expect(sessions.revokedAt("session-2")).toEqual(NOW);
    });

    it("catches a token revoked by a concurrent refresh after the first read", async () => {
      const { sessions, sessionIssuer, securityLog, refresh } = setUp({
        sessions: [session(), session({ id: "session-2", refreshTokenHash: "hash:other" })],
        beforeLockedRead: (rows) => {
          rows[0].revokedAt = EARLIER;
          rows[0].rotatedAt = EARLIER;
        },
      });

      await expect(refresh("old-token")).rejects.toThrow(InvalidSessionError);

      expect(sessions.revokedAt("session-2")).toEqual(NOW);
      expect(securityLog.reused).toEqual(["user-1"]);
      expect(sessionIssuer.issued).toEqual([]);
    });
  });

  describe("rejects with the same error, without revoking anything", () => {
    it.each([
      ["without a token", undefined],
      ["with an empty token", ""],
    ])("%s, before reading anything", async (_label, token) => {
      const { events, refresh } = setUp();

      await expect(refresh(token)).rejects.toThrow(InvalidSessionError);

      expect(events).toEqual([]);
    });

    it("with an unknown token", async () => {
      const { events, refresh } = setUp();

      await expect(refresh("unknown")).rejects.toThrow(InvalidSessionError);

      expect(events).toEqual(["find session hash:unknown"]);
    });

    it.each([
      ["when it expires", NOW],
      ["after it expired", EARLIER],
    ])("with a session that is no longer valid %s", async (_label, expiresAt) => {
      const { events, refresh } = setUp({
        sessions: [session({ expiresAt, createdAt: new Date("2026-10-01T00:00:00.000Z") })],
      });

      await expect(refresh("old-token")).rejects.toThrow(InvalidSessionError);

      expect(events).toEqual(["find session hash:old-token"]);
    });

    it("with an expired session that was also rotated, not taken as a reuse", async () => {
      const { events, securityLog, refresh } = setUp({
        sessions: [
          session({
            expiresAt: EARLIER,
            revokedAt: EARLIER,
            rotatedAt: EARLIER,
            createdAt: new Date("2026-10-01T00:00:00.000Z"),
          }),
        ],
      });

      await expect(refresh("old-token")).rejects.toThrow(InvalidSessionError);

      expect(events).not.toContain("revoke all user-1");
      expect(securityLog.reused).toEqual([]);
    });

    it("with a session that expired between the first read and the locked one", async () => {
      const { sessions, sessionIssuer, refresh } = setUp({
        sessions: [session({ expiresAt: NOW })],
        clock: () => new SteppingClock([EARLIER, NOW]),
      });

      await expect(refresh("old-token")).rejects.toThrow(InvalidSessionError);

      expect(sessions.revokedAt("session-1")).toBeUndefined();
      expect(sessionIssuer.issued).toEqual([]);
    });

    it.each([
      ["by a logout or a change to the user", undefined],
      ["concurrently, after the first read", "concurrently"],
    ])("with a session revoked %s, without logging it as a reuse", async (_label, when) => {
      const revokedBefore = when === undefined;
      const { sessions, sessionIssuer, securityLog, refresh } = setUp({
        sessions: [
          session({ revokedAt: revokedBefore ? EARLIER : undefined }),
          session({ id: "session-2", refreshTokenHash: "hash:other" }),
        ],
        beforeLockedRead: (rows) => {
          rows[0].revokedAt = EARLIER;
        },
      });

      await expect(refresh("old-token")).rejects.toThrow(InvalidSessionError);

      expect(sessions.revokedAt("session-1")).toEqual(EARLIER);
      expect(sessions.rotatedAt("session-1")).toBeUndefined();
      expect(sessions.revokedAt("session-2")).toBeUndefined();
      expect(securityLog.reused).toEqual([]);
      expect(sessionIssuer.issued).toEqual([]);
    });

    it("with a session deleted between the first read and the locked one", async () => {
      const { sessionIssuer, securityLog, refresh } = setUp({
        beforeLockedRead: (rows) => rows.splice(0),
      });

      await expect(refresh("old-token")).rejects.toThrow(InvalidSessionError);

      expect(sessionIssuer.issued).toEqual([]);
      expect(securityLog.reused).toEqual([]);
    });
  });

  describe("when the user can no longer log in", () => {
    it.each([
      ["inactive", [user({ active: false })]],
      ["deleted", [user({ deletedAt: EARLIER, deletedBy: "admin-1" })]],
      ["gone", []],
    ])("revokes only that session and rejects (%s)", async (_label, users) => {
      const { events, sessions, sessionIssuer, securityLog, refresh } = setUp({
        users,
        sessions: [session(), session({ id: "session-2", refreshTokenHash: "hash:other" })],
      });

      await expect(refresh("old-token")).rejects.toThrow(InvalidSessionError);

      expect(sessions.revokedAt("session-1")).toEqual(NOW);
      expect(sessions.revokedAt("session-2")).toBeUndefined();
      expect(events.at(-1)).toBe("commit");
      expect(sessionIssuer.issued).toEqual([]);
      expect(securityLog.reused).toEqual([]);
    });
  });
});
