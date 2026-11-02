import { Clock } from "../../../../shared/application/clock.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { User, type UserProps } from "../../domain/entities/user.js";
import { InvalidPasswordError } from "../../domain/errors/invalid-password-error.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { UserRole } from "../../domain/user-role.js";
import { Email } from "../../domain/value-objects/email.js";
import type { Password } from "../../domain/value-objects/password.js";
import { TemporaryPassword } from "../../domain/value-objects/temporary-password.js";
import { UserName } from "../../domain/value-objects/user-name.js";
import type { AuthSessionResult } from "../dto/auth-session.result.js";
import { InvalidAccessTokenError } from "../errors/invalid-access-token-error.js";
import { InvalidCurrentPasswordError } from "../errors/invalid-current-password-error.js";
import { PasswordUnchangedError } from "../errors/password-unchanged-error.js";
import { PasswordHasher } from "../ports/password-hasher.js";
import type { SessionIssuer } from "../services/session-issuer.js";
import { ChangePasswordUseCase } from "./change-password.use-case.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const EARLIER = new Date("2026-01-01T00:00:00.000Z");
const IN_HALF_AN_HOUR = new Date("2026-10-22T12:30:00.000Z");

class InMemoryUserRepository extends UserRepository {
  private reads = 0;
  readonly saved: User[] = [];

  constructor(
    private users: User[],
    private readonly events: string[],
    // Lets a test change the stored user between the first read and the locked one.
    private readonly beforeLockedRead?: () => User[],
  ) {
    super();
  }

  findById(id: string): Promise<User | null> {
    if (++this.reads === 2 && this.beforeLockedRead) {
      this.users = this.beforeLockedRead();
    }
    this.events.push(`find user ${id}`);
    return Promise.resolve(this.users.find((user) => user.getId() === id) ?? null);
  }

  save(user: User): Promise<void> {
    this.events.push(`save user ${user.getId()}`);
    this.saved.push(user);
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
    return Promise.reject(new Error("Not used by ChangePasswordUseCase"));
  }
}

class FakeHasher extends PasswordHasher {
  constructor(private readonly events: string[]) {
    super();
  }

  hash(password: Password): Promise<string> {
    this.events.push("hash password");
    return Promise.resolve(`hashed:${password.reveal()}`);
  }

  verify(hash: string, plain: string): Promise<boolean> {
    this.events.push(`check ${plain}`);
    return Promise.resolve(hash === `hashed:${plain}`);
  }

  verifyAgainstNothing(): Promise<false> {
    return Promise.reject(new Error("Not used by ChangePasswordUseCase"));
  }
}

class FakeSessionIssuer {
  readonly issued: { user: User; userAgent?: string; familyId?: string }[] = [];

  constructor(private readonly events: string[]) {}

  issue(user: User, userAgent?: string, familyId?: string): Promise<AuthSessionResult> {
    this.events.push(`issue session ${user.getId()}`);
    this.issued.push({ user, userAgent, familyId });
    return Promise.resolve({
      accessToken: "access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token",
      refreshTokenExpiresAt: new Date("2026-10-29T12:00:00.000Z"),
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

function user(overrides: Partial<UserProps> = {}): User {
  return User.reconstitute({
    id: "user-1",
    email: Email.create("ana@example.com"),
    name: UserName.create("Ana"),
    passwordHash: "hashed:current-password",
    role: UserRole.SELLER,
    active: true,
    mustChangePassword: false,
    passwordChangedAt: EARLIER,
    createdAt: EARLIER,
    updatedAt: EARLIER,
    ...overrides,
  });
}

function setUp(users: User[] = [user()], beforeLockedRead?: () => User[]) {
  const events: string[] = [];
  const repository = new InMemoryUserRepository(users, events, beforeLockedRead);
  const sessionIssuer = new FakeSessionIssuer(events);
  const useCase = new ChangePasswordUseCase(
    repository,
    new FakeHasher(events),
    sessionIssuer as unknown as SessionIssuer,
    new RecordingTransaction(events),
    new RecordingClock(events),
  );
  const change = (currentPassword: string, newPassword: string, userAgent?: string) =>
    useCase.execute({ userId: "user-1", currentPassword, newPassword, userAgent });
  return { events, repository, sessionIssuer, change };
}

describe("ChangePasswordUseCase", () => {
  describe("with the right current password", () => {
    it("stores the new password and starts a new session for this device", async () => {
      const ana = user();
      const { repository, sessionIssuer, change } = setUp([ana]);

      const result = await change("current-password", "new-password", "Firefox");

      expect(result.accessToken).toBe("access-token");
      expect(repository.saved).toEqual([ana]);
      expect(ana.passwordHash).toBe("hashed:new-password");
      expect(ana.passwordChangedAt).toEqual(NOW);
      // A new family: the database revoked every session, the current one included.
      expect(sessionIssuer.issued).toEqual([{ user: ana, userAgent: "Firefox" }]);
    });

    it("ends a pending change and drops a pending temporary password", async () => {
      const ana = user({
        mustChangePassword: true,
        temporaryPassword: new TemporaryPassword("hashed:temporary", IN_HALF_AN_HOUR),
      });
      const { change } = setUp([ana]);

      const result = await change("current-password", "new-password");

      expect(ana.mustChangePassword).toBe(false);
      expect(ana.temporaryPassword).toBeUndefined();
      expect(result.user.mustChangePassword).toBe(false);
    });

    it("hashes outside the transaction, then saves before starting the session", async () => {
      const { events, change } = setUp();

      await change("current-password", "new-password");

      expect(events).toEqual([
        "find user user-1",
        "check current-password",
        "hash password",
        "begin",
        "find user user-1",
        "read clock",
        "save user user-1",
        "issue session user-1",
        "commit",
      ]);
    });

    it("does not record a login", async () => {
      const ana = user();
      const { change } = setUp([ana]);

      await change("current-password", "new-password");

      expect(ana.lastLoginAt).toBeUndefined();
    });
  });

  describe("rejects without changing anything", () => {
    it.each([
      ["too short", "short", "length"],
      ["with a lone surrogate", "new-password\uD800", "characters"],
    ])("a new password %s, before any check", async (_label, newPassword, reason) => {
      const { events, change } = setUp();

      await expect(change("current-password", newPassword)).rejects.toEqual(
        new InvalidPasswordError(reason as "length" | "characters"),
      );

      expect(events).toEqual([]);
    });

    it("a wrong current password, without opening a transaction", async () => {
      const { events, repository, change } = setUp();

      await expect(change("wrong-password", "new-password")).rejects.toThrow(
        InvalidCurrentPasswordError,
      );

      expect(events).toEqual(["find user user-1", "check wrong-password"]);
      expect(repository.saved).toEqual([]);
    });

    it("a new password equal to the current one", async () => {
      const { events, change } = setUp();

      await expect(change("current-password", "current-password")).rejects.toThrow(
        PasswordUnchangedError,
      );

      expect(events).not.toContain("hash password");
      expect(events).not.toContain("begin");
    });

    it.each([
      ["inactive", [user({ active: false })]],
      ["deleted", [user({ deletedAt: EARLIER, deletedBy: "admin-1" })]],
      ["gone", []],
    ])("a user who can no longer log in (%s)", async (_label, users) => {
      const { events, change } = setUp(users);

      await expect(change("current-password", "new-password")).rejects.toThrow(
        InvalidAccessTokenError,
      );

      expect(events).toEqual(["find user user-1"]);
    });

    it("a user deactivated between the checks and the lock", async () => {
      const { events, repository, change } = setUp([user()], () => [user({ active: false })]);

      await expect(change("current-password", "new-password")).rejects.toThrow(
        InvalidAccessTokenError,
      );

      expect(repository.saved).toEqual([]);
      expect(events.at(-1)).toBe("rollback");
    });

    it("a password changed between the checks and the lock", async () => {
      const { repository, sessionIssuer, change } = setUp([user()], () => [
        user({ passwordHash: "hashed:changed-elsewhere" }),
      ]);

      await expect(change("current-password", "new-password")).rejects.toThrow(
        InvalidCurrentPasswordError,
      );

      expect(repository.saved).toEqual([]);
      expect(sessionIssuer.issued).toEqual([]);
    });
  });
});
