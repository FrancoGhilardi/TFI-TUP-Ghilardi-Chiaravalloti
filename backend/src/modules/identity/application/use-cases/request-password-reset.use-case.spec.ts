import { Clock } from "../../../../shared/application/clock.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { User, type UserProps } from "../../domain/entities/user.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { UserRole } from "../../domain/user-role.js";
import { Email } from "../../domain/value-objects/email.js";
import type { Password } from "../../domain/value-objects/password.js";
import { TemporaryPassword } from "../../domain/value-objects/temporary-password.js";
import { UserName } from "../../domain/value-objects/user-name.js";
import { AuthSettings } from "../auth-settings.js";
import { PasswordHasher } from "../ports/password-hasher.js";
import { PasswordResetNotifier } from "../ports/password-reset-notifier.js";
import { TemporaryPasswordGenerator } from "../ports/temporary-password-generator.js";
import { RequestPasswordResetUseCase } from "./request-password-reset.use-case.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const EARLIER = new Date("2026-01-01T00:00:00.000Z");
const IN_30_MINUTES = new Date("2026-10-22T12:30:00.000Z");
const MINUTE_MS = 60_000;
const TEMPORARY = "Tmp2Pass3Key";

class InMemoryUserRepository extends UserRepository {
  private reads = 0;
  readonly saved: User[] = [];

  constructor(
    private users: User[],
    private readonly events: string[],
    // Lets a test change the stored users before a given read: the first one, the locked one
    // and the one that withdraws a password whose mail failed.
    private readonly beforeRead?: (read: number) => User[] | undefined,
  ) {
    super();
  }

  findByEmail(email: Email): Promise<User | null> {
    this.users = this.beforeRead?.(++this.reads) ?? this.users;
    this.events.push(`find user ${email.toString()}`);
    // Like the real repository, deleted users are not found.
    const found = this.users.find((user) => user.email.equals(email) && !user.isDeleted());
    return Promise.resolve(found ?? null);
  }

  save(user: User): Promise<void> {
    this.events.push(`save user ${user.getId()}`);
    this.saved.push(user);
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
    return Promise.reject(new Error("Not used by RequestPasswordResetUseCase"));
  }
}

class FixedGenerator extends TemporaryPasswordGenerator {
  constructor(private readonly events: string[]) {
    super();
  }

  generate(): string {
    this.events.push("generate");
    return TEMPORARY;
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

  verify(): Promise<boolean> {
    return Promise.reject(new Error("Not used by RequestPasswordResetUseCase"));
  }

  verifyAgainstNothing(): Promise<false> {
    return Promise.reject(new Error("Not used by RequestPasswordResetUseCase"));
  }
}

class RecordingNotifier extends PasswordResetNotifier {
  readonly sent: { to: string; name: string; temporaryPassword: string; expiresAt: Date }[] = [];

  constructor(
    private readonly events: string[],
    private readonly failure?: Error,
  ) {
    super();
  }

  sendTemporaryPassword(
    to: string,
    name: string,
    temporaryPassword: string,
    expiresAt: Date,
  ): Promise<void> {
    this.events.push(`send mail ${to}`);
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    this.sent.push({ to, name, temporaryPassword, expiresAt });
    return Promise.resolve();
  }

  sendAssignedPassword(): Promise<void> {
    return Promise.reject(new Error("Not used by RequestPasswordResetUseCase"));
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

function user(overrides: Partial<UserProps> = {}): User {
  return User.reconstitute({
    id: "user-1",
    email: Email.create("ana@example.com"),
    name: UserName.create("Ana"),
    passwordHash: "hashed:current-password",
    role: UserRole.SELLER,
    active: true,
    mustChangePassword: false,
    createdAt: EARLIER,
    updatedAt: EARLIER,
    ...overrides,
  });
}

/** A temporary password issued `minutesAgo` minutes before now, with the 30-minute lifetime. */
const issued = (minutesAgo: number) =>
  new TemporaryPassword("hashed:older", new Date(NOW.getTime() + (30 - minutesAgo) * MINUTE_MS));

function setUp(
  options: {
    users?: User[];
    beforeRead?: (read: number) => User[] | undefined;
    mailFailure?: Error;
  } = {},
) {
  const events: string[] = [];
  const repository = new InMemoryUserRepository(
    options.users ?? [user()],
    events,
    options.beforeRead,
  );
  const notifier = new RecordingNotifier(events, options.mailFailure);
  const useCase = new RequestPasswordResetUseCase(
    repository,
    new FixedGenerator(events),
    new FakeHasher(events),
    notifier,
    new RecordingTransaction(events),
    new FixedClock(),
    new AuthSettings(7),
  );
  const request = (email: string) => useCase.execute({ email });
  return { events, repository, notifier, request };
}

describe("RequestPasswordResetUseCase", () => {
  describe("for a user who can log in", () => {
    it("stores a temporary password that expires with its lifetime, and mails it", async () => {
      const ana = user();
      const { repository, notifier, request } = setUp({ users: [ana] });

      await request("ana@example.com");

      expect(repository.saved).toEqual([ana]);
      expect(ana.temporaryPassword).toEqual(
        new TemporaryPassword(`hashed:${TEMPORARY}`, IN_30_MINUTES),
      );
      expect(notifier.sent).toEqual([
        {
          to: "ana@example.com",
          name: "Ana",
          temporaryPassword: TEMPORARY,
          expiresAt: IN_30_MINUTES,
        },
      ]);
    });

    it("keeps the current password and the pending change as they were", async () => {
      const ana = user({ mustChangePassword: true });
      const { request } = setUp({ users: [ana] });

      await request("ana@example.com");

      expect(ana.passwordHash).toBe("hashed:current-password");
      expect(ana.mustChangePassword).toBe(true);
      expect(ana.passwordChangedAt).toBeUndefined();
    });

    it("finds the user whatever the case of the email", async () => {
      const { notifier, request } = setUp();

      await request("ANA@Example.com");

      expect(notifier.sent).toHaveLength(1);
    });

    it("hashes before the transaction and mails after the commit", async () => {
      const { events, request } = setUp();

      await request("ana@example.com");

      expect(events).toEqual([
        "find user ana@example.com",
        "generate",
        "hash password",
        "begin",
        "find user ana@example.com",
        "save user user-1",
        "commit",
        "send mail ana@example.com",
      ]);
    });

    it("replaces a pending temporary password once the wait is over", async () => {
      const ana = user({ temporaryPassword: issued(5) });
      const { notifier, request } = setUp({ users: [ana] });

      await request("ana@example.com");

      expect(ana.temporaryPassword?.hash).toBe(`hashed:${TEMPORARY}`);
      expect(notifier.sent).toHaveLength(1);
    });

    it("withdraws the temporary password when the mail cannot be sent", async () => {
      const failure = new Error("mail provider down");
      const ana = user();
      const { events, repository, request } = setUp({ users: [ana], mailFailure: failure });

      await expect(request("ana@example.com")).rejects.toBe(failure);

      expect(ana.temporaryPassword).toBeUndefined();
      expect(repository.saved).toEqual([ana, ana]);
      expect(events.slice(-5)).toEqual([
        "send mail ana@example.com",
        "begin",
        "find user ana@example.com",
        "save user user-1",
        "commit",
      ]);
    });

    it("keeps a temporary password issued by another request meanwhile", async () => {
      const newer = user({ temporaryPassword: issued(0) });
      const { repository, request } = setUp({
        mailFailure: new Error("mail provider down"),
        beforeRead: (read) => (read === 3 ? [newer] : undefined),
      });

      await expect(request("ana@example.com")).rejects.toThrow("mail provider down");

      expect(newer.temporaryPassword?.hash).toBe("hashed:older");
      expect(repository.saved).toHaveLength(1);
    });

    it("reports a temporary password it could not withdraw", async () => {
      const { request } = setUp({
        mailFailure: new Error("mail provider down"),
        beforeRead: (read) => {
          if (read === 3) throw new Error("database down");
          return undefined;
        },
      });

      const error = await request("ana@example.com").catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(AggregateError);
      expect(error).toMatchObject({
        message: "The temporary password mail failed and the password could not be withdrawn",
        errors: [new Error("mail provider down"), new Error("database down")],
      });
    });
  });

  describe("does nothing, without failing", () => {
    it.each([
      ["a malformed email", "not-an-email", ["generate", "hash password"]],
      [
        "an unknown email",
        "nobody@example.com",
        ["find user nobody@example.com", "generate", "hash password"],
      ],
    ])("for %s, hashing a decoy all the same", async (_label, email, expected) => {
      const { events, notifier, request } = setUp();

      await expect(request(email)).resolves.toBeUndefined();

      expect(events).toEqual(expected);
      expect(notifier.sent).toEqual([]);
    });

    it.each([
      ["inactive", user({ active: false })],
      ["deleted", user({ deletedAt: EARLIER, deletedBy: "admin-1" })],
      ["within the wait after the last request", user({ temporaryPassword: issued(4) })],
    ])("for a user %s, hashing a decoy all the same", async (_label, stored) => {
      const { events, repository, request } = setUp({ users: [stored] });

      await expect(request("ana@example.com")).resolves.toBeUndefined();

      expect(events).toEqual(["find user ana@example.com", "generate", "hash password"]);
      expect(repository.saved).toEqual([]);
    });

    it.each([
      ["another request served it meanwhile", user({ temporaryPassword: issued(0) })],
      ["it was deactivated meanwhile", user({ active: false })],
    ])("when %s, checked with the row locked", async (_label, changed) => {
      const { events, repository, notifier, request } = setUp({
        beforeRead: (read) => (read === 2 ? [changed] : undefined),
      });

      await expect(request("ana@example.com")).resolves.toBeUndefined();

      expect(repository.saved).toEqual([]);
      expect(notifier.sent).toEqual([]);
      expect(events.at(-1)).toBe("commit");
    });
  });
});
