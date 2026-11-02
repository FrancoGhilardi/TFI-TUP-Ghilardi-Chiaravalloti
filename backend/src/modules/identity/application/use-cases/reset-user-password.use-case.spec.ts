import { Clock } from "../../../../shared/application/clock.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { User, type UserProps } from "../../domain/entities/user.js";
import { DeletedUserError } from "../../domain/errors/deleted-user-error.js";
import { SelfAdministrationError } from "../../domain/errors/self-administration-error.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { UserAdministrationPolicy } from "../../domain/services/user-administration.policy.js";
import { UserRole } from "../../domain/user-role.js";
import { Email } from "../../domain/value-objects/email.js";
import type { Password } from "../../domain/value-objects/password.js";
import { TemporaryPassword } from "../../domain/value-objects/temporary-password.js";
import { UserName } from "../../domain/value-objects/user-name.js";
import { MailDeliveryError } from "../errors/mail-delivery-error.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import { PasswordHasher } from "../ports/password-hasher.js";
import { PasswordResetNotifier } from "../ports/password-reset-notifier.js";
import { TemporaryPasswordGenerator } from "../ports/temporary-password-generator.js";
import { TemporaryPasswordFactory } from "../services/temporary-password-factory.js";
import { ResetUserPasswordUseCase } from "./reset-user-password.use-case.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const EARLIER = new Date("2026-01-01T00:00:00.000Z");
const ADMIN_ID = "admin-1";
const TEMPORARY = "Tmp2Pass3Key";

class InMemoryUserRepository extends UserRepository {
  private reads = 0;
  readonly saved: User[] = [];

  constructor(
    private users: User[],
    private readonly events: string[],
    // Lets a test change the stored users before the locked read, the second one.
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
    return Promise.reject(new Error("Not used by ResetUserPasswordUseCase"));
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
    return Promise.reject(new Error("Not used"));
  }

  verifyAgainstNothing(): Promise<false> {
    return Promise.reject(new Error("Not used"));
  }
}

class RecordingNotifier extends PasswordResetNotifier {
  readonly sent: { to: string; name: string; temporaryPassword: string }[] = [];

  constructor(
    private readonly events: string[],
    private readonly failure?: Error,
  ) {
    super();
  }

  sendAssignedPassword(to: string, name: string, temporaryPassword: string): Promise<void> {
    this.events.push(`send mail ${to}`);
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    this.sent.push({ to, name, temporaryPassword });
    return Promise.resolve();
  }

  sendTemporaryPassword(): Promise<void> {
    return Promise.reject(new Error("Not used by ResetUserPasswordUseCase"));
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
    id: "user-2",
    email: Email.create("ana@example.com"),
    name: UserName.create("Ana"),
    passwordHash: "hashed:old-password",
    role: UserRole.SELLER,
    active: true,
    mustChangePassword: false,
    createdAt: EARLIER,
    updatedAt: EARLIER,
    ...overrides,
  });
}

function setUp(
  options: { users?: User[]; beforeLockedRead?: () => User[]; mailFailure?: Error } = {},
) {
  const events: string[] = [];
  const repository = new InMemoryUserRepository(
    options.users ?? [user()],
    events,
    options.beforeLockedRead,
  );
  const notifier = new RecordingNotifier(events, options.mailFailure);
  const useCase = new ResetUserPasswordUseCase(
    repository,
    new TemporaryPasswordFactory(new FixedGenerator(events), new FakeHasher(events)),
    notifier,
    new UserAdministrationPolicy(),
    new RecordingTransaction(events),
    new FixedClock(),
  );
  const reset = (userId = "user-2", actorId = ADMIN_ID) => useCase.execute({ actorId, userId });
  return { events, repository, notifier, reset };
}

describe("ResetUserPasswordUseCase", () => {
  describe("for another user", () => {
    it("replaces the password, drops a pending one and forces a change, by the admin", async () => {
      const ana = user({
        temporaryPassword: new TemporaryPassword("hashed:forgot", new Date(NOW.getTime() + 60_000)),
      });
      const { repository, reset } = setUp({ users: [ana] });

      await reset();

      expect(repository.saved).toEqual([ana]);
      expect(ana.passwordHash).toBe(`hashed:${TEMPORARY}`);
      expect(ana.mustChangePassword).toBe(true);
      expect(ana.temporaryPassword).toBeUndefined();
      expect(ana.passwordChangedAt).toEqual(NOW);
      expect(ana.updatedBy).toBe(ADMIN_ID);
    });

    it("mails the new password to the user", async () => {
      const { notifier, reset } = setUp();

      await reset();

      expect(notifier.sent).toEqual([
        { to: "ana@example.com", name: "Ana", temporaryPassword: TEMPORARY },
      ]);
    });

    it("hashes before the transaction and mails inside it, after saving", async () => {
      const { events, reset } = setUp();

      await reset();

      expect(events).toEqual([
        "find user user-2",
        "generate",
        "hash password",
        "begin",
        "find user user-2",
        "save user user-2",
        "send mail ana@example.com",
        "commit",
      ]);
    });

    it("also resets an inactive user", async () => {
      const ana = user({ active: false });
      const { reset } = setUp({ users: [ana] });

      await reset();

      expect(ana.mustChangePassword).toBe(true);
    });
  });

  describe("rolls everything back when the mail fails", () => {
    it.each([
      ["rejected by the provider", false],
      ["with an unknown outcome", true],
    ])("%s, letting the error through", async (_label, maybeDelivered) => {
      const failure = new MailDeliveryError(new Error("provider"), maybeDelivered);
      const { events, reset } = setUp({ mailFailure: failure });

      await expect(reset()).rejects.toBe(failure);

      expect(events.slice(-2)).toEqual(["send mail ana@example.com", "rollback"]);
    });
  });

  describe("refuses without hashing", () => {
    it.each([
      [
        "the admin's own account",
        () => setUp({ users: [user({ id: ADMIN_ID })] }),
        ADMIN_ID,
        SelfAdministrationError,
      ],
      [
        "a deleted user",
        () => setUp({ users: [user({ active: false, deletedAt: EARLIER, deletedBy: ADMIN_ID })] }),
        "user-2",
        DeletedUserError,
      ],
      ["an unknown user", () => setUp({ users: [] }), "user-2", UserNotFoundError],
    ])("%s", async (_label, build, userId, error) => {
      const { events, repository, reset } = build();

      await expect(reset(userId)).rejects.toThrow(error);

      expect(events).toEqual([`find user ${userId}`]);
      expect(repository.saved).toEqual([]);
    });
  });

  it.each([
    [
      "deleted",
      () => [user({ active: false, deletedAt: NOW, deletedBy: ADMIN_ID })],
      DeletedUserError,
    ],
    ["removed", () => [], UserNotFoundError],
  ])(
    "refuses a user %s between the first read and the lock",
    async (_label, beforeLockedRead, error) => {
      const { repository, notifier, reset } = setUp({ beforeLockedRead });

      await expect(reset()).rejects.toThrow(error);

      expect(repository.saved).toEqual([]);
      expect(notifier.sent).toEqual([]);
    },
  );
});
