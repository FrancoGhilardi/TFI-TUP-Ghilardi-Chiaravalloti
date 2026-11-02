import { Clock } from "../../../../shared/application/clock.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { User, type UserProps } from "../../domain/entities/user.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { UserRole } from "../../domain/user-role.js";
import type { Email } from "../../domain/value-objects/email.js";
import { Email as EmailValue } from "../../domain/value-objects/email.js";
import type { Password } from "../../domain/value-objects/password.js";
import { TemporaryPassword } from "../../domain/value-objects/temporary-password.js";
import { UserName } from "../../domain/value-objects/user-name.js";
import type { AuthSessionResult } from "../dto/auth-session.result.js";
import { InvalidCredentialsError } from "../errors/invalid-credentials-error.js";
import { PasswordHasher } from "../ports/password-hasher.js";
import type { SessionIssuer } from "../services/session-issuer.js";
import { LoginUseCase } from "./login.use-case.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const EARLIER = new Date("2026-01-01T00:00:00.000Z");

class InMemoryUserRepository extends UserRepository {
  private reads = 0;

  constructor(
    private readonly users: User[],
    private readonly events: string[],
    // Lets a test change the stored users between the first read and the locked one.
    private readonly beforeLockedRead?: (users: User[]) => void,
  ) {
    super();
  }

  findByEmail(email: Email): Promise<User | null> {
    if (++this.reads === 2) {
      this.beforeLockedRead?.(this.users);
    }
    // Like the real repository, deleted users are not found.
    const found = this.users.find((user) => user.email.equals(email) && !user.isDeleted());
    return Promise.resolve(found ?? null);
  }

  save(user: User): Promise<void> {
    this.events.push(`save user ${user.getId()}`);
    return Promise.resolve();
  }

  findById(): Promise<User | null> {
    return this.unused();
  }

  existsByEmail(): Promise<boolean> {
    return this.unused();
  }

  countOtherActiveAdmins(): Promise<number> {
    return this.unused();
  }

  private unused(): Promise<never> {
    return Promise.reject(new Error("Not used by LoginUseCase"));
  }
}

class FakeHasher extends PasswordHasher {
  readonly checks: string[] = [];

  constructor(private readonly events: string[]) {
    super();
  }

  hash(password: Password): Promise<string> {
    return Promise.resolve(`hashed:${password.reveal()}`);
  }

  verify(hash: string, plain: string): Promise<boolean> {
    this.record(hash);
    return Promise.resolve(hash === `hashed:${plain}`);
  }

  verifyAgainstNothing(): Promise<false> {
    this.record("decoy");
    return Promise.resolve(false);
  }

  private record(against: string): void {
    this.checks.push(against);
    this.events.push("check password");
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
    const result = await work();
    this.events.push("commit");
    return result;
  }
}

class FixedClock extends Clock {
  now(): Date {
    return NOW;
  }
}

function user(overrides: Partial<UserProps> = {}): User {
  return User.reconstitute({
    id: "user-1",
    email: EmailValue.create("ana@example.com"),
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

const temporary = (expiresAt: Date) =>
  new TemporaryPassword("hashed:temporary-password", expiresAt);

function setUp(users: User[], beforeLockedRead?: (users: User[]) => void) {
  const events: string[] = [];
  const hasher = new FakeHasher(events);
  const sessionIssuer = new FakeSessionIssuer(events);
  const useCase = new LoginUseCase(
    new InMemoryUserRepository(users, events, beforeLockedRead),
    hasher,
    sessionIssuer as unknown as SessionIssuer,
    new RecordingTransaction(events),
    new FixedClock(),
  );
  const login = (email: string, password: string, userAgent?: string) =>
    useCase.execute({ email, password, userAgent });
  return { events, hasher, sessionIssuer, login };
}

describe("LoginUseCase", () => {
  describe("with the current password", () => {
    it("starts a session and records the login", async () => {
      const ana = user();
      const { sessionIssuer, login } = setUp([ana]);

      const result = await login("ana@example.com", "current-password", "Firefox");

      expect(result.accessToken).toBe("access-token");
      expect(sessionIssuer.issued).toEqual([{ user: ana, userAgent: "Firefox" }]);
      expect(ana.lastLoginAt).toEqual(NOW);
      expect(ana.passwordHash).toBe("hashed:current-password");
      expect(ana.passwordChangedAt).toEqual(EARLIER);
    });

    it("finds the user whatever the case of the email", async () => {
      const { login } = setUp([user()]);

      await expect(login("ANA@Example.com", "current-password")).resolves.toBeDefined();
    });

    it("discards a temporary password still pending", async () => {
      const ana = user({ temporaryPassword: temporary(new Date("2026-10-22T12:30:00.000Z")) });
      const { login } = setUp([ana]);

      await login("ana@example.com", "current-password");

      expect(ana.temporaryPassword).toBeUndefined();
      expect(ana.mustChangePassword).toBe(false);
    });

    it("keeps a pending password change", async () => {
      const ana = user({ mustChangePassword: true });
      const { login } = setUp([ana]);

      const result = await login("ana@example.com", "current-password");

      expect(result.user.mustChangePassword).toBe(true);
    });
  });

  describe("with the temporary password", () => {
    it("makes it the password, forces a change and records the login", async () => {
      const ana = user({ temporaryPassword: temporary(new Date("2026-10-22T12:30:00.000Z")) });
      const { sessionIssuer, login } = setUp([ana]);

      await login("ana@example.com", "temporary-password");

      expect(sessionIssuer.issued).toHaveLength(1);
      expect(ana.passwordHash).toBe("hashed:temporary-password");
      expect(ana.mustChangePassword).toBe(true);
      expect(ana.temporaryPassword).toBeUndefined();
      expect(ana.passwordChangedAt).toEqual(NOW);
      expect(ana.lastLoginAt).toEqual(NOW);
    });

    it("leaves the previous password unusable afterwards", async () => {
      const ana = user({ temporaryPassword: temporary(new Date("2026-10-22T12:30:00.000Z")) });
      const { login } = setUp([ana]);
      await login("ana@example.com", "temporary-password");

      await expect(login("ana@example.com", "current-password")).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      );
    });

    it("cannot be used twice", async () => {
      const ana = user({ temporaryPassword: temporary(new Date("2026-10-22T12:30:00.000Z")) });
      const { login } = setUp([ana]);
      await login("ana@example.com", "temporary-password");

      // It is now the password, so it keeps working, but there is no temporary one left.
      await expect(login("ana@example.com", "temporary-password")).resolves.toBeDefined();
      expect(ana.temporaryPassword).toBeUndefined();
    });
  });

  describe("rejects with the same error", () => {
    const expired = () => user({ temporaryPassword: temporary(NOW) });

    it.each([
      ["the email is unknown", [user()], "bob@example.com", "current-password"],
      ["the email is not an email", [user()], "not-an-email", "current-password"],
      ["the password is wrong", [user()], "ana@example.com", "wrong-password"],
      ["the temporary password expired", [expired()], "ana@example.com", "temporary-password"],
      ["the user is inactive", [user({ active: false })], "ana@example.com", "current-password"],
      [
        "the user was deleted",
        [user({ deletedAt: EARLIER })],
        "ana@example.com",
        "current-password",
      ],
    ])("when %s", async (_label, users, email, password) => {
      const { events, sessionIssuer, login } = setUp(users);

      const error = await login(email, password).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(InvalidCredentialsError);
      expect(error).toMatchObject({
        code: "INVALID_CREDENTIALS",
        message: "El email o la contraseña no son correctos.",
      });
      expect(sessionIssuer.issued).toEqual([]);
      expect(events).not.toContain("save user user-1");
      expect(events).not.toContain("commit");
    });

    it.each([
      ["the email is unknown", "bob@example.com"],
      ["the email is not an email", "not-an-email"],
    ])("checking against the decoy twice when %s", async (_label, email) => {
      const { hasher, login } = setUp([user()]);

      await login(email, "typed-password").catch(() => undefined);

      expect(hasher.checks).toEqual(["decoy", "decoy"]);
    });

    it("without touching an inactive user who typed the right temporary password", async () => {
      const ana = user({
        active: false,
        temporaryPassword: temporary(new Date("2026-10-22T12:30:00.000Z")),
      });
      const { login } = setUp([ana]);

      await expect(login("ana@example.com", "temporary-password")).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      );
      expect(ana.passwordHash).toBe("hashed:current-password");
      expect(ana.temporaryPassword).toBeDefined();
      expect(ana.lastLoginAt).toBeUndefined();
    });
  });

  describe("always checks two passwords, so the timing reveals nothing", () => {
    const pending = () => temporary(new Date("2026-10-22T12:30:00.000Z"));

    it.each<[string, User[], string, string, string[]]>([
      ["unknown email", [], "bob@example.com", "any", ["decoy", "decoy"]],
      [
        "wrong password",
        [user()],
        "ana@example.com",
        "wrong",
        ["hashed:current-password", "decoy"],
      ],
      [
        "wrong password, temporary pending",
        [user({ temporaryPassword: pending() })],
        "ana@example.com",
        "wrong",
        ["hashed:current-password", "hashed:temporary-password"],
      ],
      [
        "wrong password, temporary expired",
        [user({ temporaryPassword: temporary(NOW) })],
        "ana@example.com",
        "temporary-password",
        ["hashed:current-password", "decoy"],
      ],
      [
        "current password",
        [user()],
        "ana@example.com",
        "current-password",
        ["hashed:current-password", "decoy"],
      ],
      [
        "temporary password",
        [user({ temporaryPassword: pending() })],
        "ana@example.com",
        "temporary-password",
        ["hashed:current-password", "hashed:temporary-password"],
      ],
    ])("with %s", async (_label, users, email, password, checks) => {
      const { hasher, login } = setUp(users);

      await login(email, password).catch(() => undefined);

      expect(hasher.checks).toEqual(checks);
    });
  });

  describe("when the user changes between the password check and the locked read", () => {
    const pending = () => temporary(new Date("2026-10-22T12:30:00.000Z"));

    it.each<[string, Partial<UserProps>, (users: User[]) => void, string]>([
      [
        "the password was changed",
        {},
        (users) => users[0]?.changePassword("hashed:another-password", NOW),
        "current-password",
      ],
      [
        "the temporary password was used",
        { temporaryPassword: pending() },
        (users) => users[0]?.consumeTemporaryPassword(NOW),
        "temporary-password",
      ],
      [
        "the temporary password was discarded",
        { temporaryPassword: pending() },
        (users) => users[0]?.discardTemporaryPassword(NOW),
        "temporary-password",
      ],
      [
        "the user was deactivated",
        {},
        (users) => users[0]?.deactivate("admin-1", NOW),
        "current-password",
      ],
      [
        "the user was replaced by another with the same email",
        {},
        (users) => users.splice(0, 1, user({ id: "user-2" })),
        "current-password",
      ],
    ])("rejects when %s", async (_label, props, change, password) => {
      const { events, sessionIssuer, login } = setUp([user(props)], change);

      await expect(login("ana@example.com", password)).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      );
      expect(sessionIssuer.issued).toEqual([]);
      expect(events.some((event) => event.startsWith("save user"))).toBe(false);
    });
  });

  it("checks the passwords before the transaction, then saves the user before the session", async () => {
    const { events, login } = setUp([user()]);

    await login("ana@example.com", "current-password");

    expect(events).toEqual([
      "check password",
      "check password",
      "begin",
      "save user user-1",
      "issue session user-1",
      "commit",
    ]);
  });
});
