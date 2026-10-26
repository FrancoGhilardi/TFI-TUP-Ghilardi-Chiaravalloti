import { Clock } from "../../../../shared/application/clock.js";
import { IdGenerator } from "../../../../shared/application/id-generator.js";
import type { Page } from "../../../../shared/application/pagination.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { User, type UserProps } from "../../domain/entities/user.js";
import { DeletedUserError } from "../../domain/errors/deleted-user-error.js";
import { EmailAlreadyInUseError } from "../../domain/errors/email-already-in-use-error.js";
import { InvalidEmailError } from "../../domain/errors/invalid-email-error.js";
import { InvalidPasswordError } from "../../domain/errors/invalid-password-error.js";
import { InvalidUserNameError } from "../../domain/errors/invalid-user-name-error.js";
import { LastActiveAdminError } from "../../domain/errors/last-active-admin-error.js";
import { SelfAdministrationError } from "../../domain/errors/self-administration-error.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { UserAdministrationPolicy } from "../../domain/services/user-administration.policy.js";
import { UserRole } from "../../domain/user-role.js";
import { Email } from "../../domain/value-objects/email.js";
import type { Password } from "../../domain/value-objects/password.js";
import { UserName } from "../../domain/value-objects/user-name.js";
import type { UserResult } from "../dto/user.result.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import { PasswordHasher } from "../ports/password-hasher.js";
import { UserQueries } from "../ports/user-queries.js";
import { CreateUserUseCase } from "./create-user.use-case.js";
import { UpdateUserUseCase } from "./update-user.use-case.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const EARLIER = new Date("2026-01-01T00:00:00.000Z");
const ADMIN_ID = "admin-1";

class InMemoryUserRepository extends UserRepository {
  constructor(
    readonly users: User[],
    private readonly events: string[],
  ) {
    super();
  }

  findById(id: string): Promise<User | null> {
    this.events.push(`find user ${id}`);
    return Promise.resolve(this.users.find((user) => user.getId() === id) ?? null);
  }

  existsByEmail(email: Email, excludeId?: string): Promise<boolean> {
    this.events.push(`check email ${email.toString()}`);
    return Promise.resolve(
      this.users.some(
        (user) => user.email.equals(email) && !user.isDeleted() && user.getId() !== excludeId,
      ),
    );
  }

  countOtherActiveAdmins(excludeId: string): Promise<number> {
    this.events.push("count admins");
    return Promise.resolve(
      this.users.filter((user) => user.isActiveAdmin() && user.getId() !== excludeId).length,
    );
  }

  save(user: User): Promise<void> {
    this.events.push(`save user ${user.getId()}`);
    if (!this.users.includes(user)) {
      this.users.push(user);
    }
    return Promise.resolve();
  }

  findByEmail(): Promise<User | null> {
    return Promise.reject(new Error("Not used"));
  }
}

/** Reads back what the repository holds, as the real queries read the table. */
class RepositoryBackedQueries extends UserQueries {
  constructor(private readonly repository: InMemoryUserRepository) {
    super();
  }

  findById(id: string): Promise<UserResult | null> {
    const user = this.repository.users.find((stored) => stored.getId() === id);
    return Promise.resolve(
      user
        ? {
            id: user.getId(),
            email: user.email.toString(),
            name: user.name.toString(),
            role: user.role,
            isActive: user.active,
            mustChangePassword: user.mustChangePassword,
            lastLoginAt: user.lastLoginAt ?? null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            deletedAt: user.deletedAt ?? null,
          }
        : null,
    );
  }

  findPage(): Promise<Page<UserResult>> {
    return Promise.reject(new Error("Not used"));
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

class FixedIds extends IdGenerator {
  next(): string {
    return "user-new";
  }
}

class FixedClock extends Clock {
  now(): Date {
    return NOW;
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

function user(id: string, overrides: Partial<UserProps> = {}): User {
  return User.reconstitute({
    id,
    email: Email.create(`${id}@example.com`),
    name: UserName.create(`User ${id}`),
    passwordHash: "hash",
    role: UserRole.SELLER,
    active: true,
    mustChangePassword: false,
    createdAt: EARLIER,
    updatedAt: EARLIER,
    ...overrides,
  });
}

const admin = (id = ADMIN_ID, overrides: Partial<UserProps> = {}) =>
  user(id, { role: UserRole.ADMIN, ...overrides });

function setUp(users: User[] = [admin(), user("user-2")]) {
  const events: string[] = [];
  const repository = new InMemoryUserRepository(users, events);
  const queries = new RepositoryBackedQueries(repository);
  const create = new CreateUserUseCase(
    repository,
    new FakeHasher(events),
    new FixedIds(),
    queries,
    new FixedClock(),
  );
  const update = new UpdateUserUseCase(
    repository,
    new UserAdministrationPolicy(),
    queries,
    new RecordingTransaction(events),
    new FixedClock(),
  );
  return { events, repository, create, update };
}

describe("CreateUserUseCase", () => {
  const command = {
    actorId: ADMIN_ID,
    email: "nuevo@example.com",
    name: "Nuevo",
    role: UserRole.SELLER,
    temporaryPassword: "temporary-123",
  };

  it("creates an active user who must change the password, made by the admin", async () => {
    const { repository, create } = setUp();

    const result = await create.execute(command);

    expect(result).toMatchObject({
      id: "user-new",
      email: "nuevo@example.com",
      name: "Nuevo",
      role: UserRole.SELLER,
      isActive: true,
      mustChangePassword: true,
      createdAt: NOW,
      deletedAt: null,
    });
    const stored = repository.users.find((candidate) => candidate.getId() === "user-new");
    expect(stored?.passwordHash).toBe("hashed:temporary-123");
    expect(stored?.createdBy).toBe(ADMIN_ID);
  });

  it("checks the email before hashing", async () => {
    const { events, create } = setUp();

    await create.execute(command);

    expect(events).toEqual([
      "check email nuevo@example.com",
      "hash password",
      "save user user-new",
    ]);
  });

  it("refuses an email another current user has, whatever its case", async () => {
    const { events, create } = setUp();

    await expect(create.execute({ ...command, email: "USER-2@example.com" })).rejects.toThrow(
      EmailAlreadyInUseError,
    );

    expect(events).not.toContain("hash password");
  });

  it("allows the email of a deleted user", async () => {
    const { create } = setUp([
      admin(),
      user("user-2", { deletedAt: EARLIER, deletedBy: ADMIN_ID, active: false }),
    ]);

    await expect(
      create.execute({ ...command, email: "user-2@example.com" }),
    ).resolves.toMatchObject({ email: "user-2@example.com" });
  });

  it.each([
    ["a malformed email", { email: "not-an-email" }, InvalidEmailError],
    ["a blank name", { name: "   " }, InvalidUserNameError],
    ["a password that breaks the policy", { temporaryPassword: "short" }, InvalidPasswordError],
  ])("refuses %s before reading anything", async (_label, change, error) => {
    const { events, create } = setUp();

    await expect(create.execute({ ...command, ...change })).rejects.toThrow(error);

    expect(events).toEqual([]);
  });
});

describe("UpdateUserUseCase", () => {
  const change = (overrides: Partial<Parameters<UpdateUserUseCase["execute"]>[0]>) => ({
    actorId: ADMIN_ID,
    userId: "user-2",
    ...overrides,
  });

  it("changes only the fields sent, and records the admin", async () => {
    const { repository, update } = setUp();

    const result = await update.execute(change({ name: "Renamed", role: UserRole.ADMIN }));

    expect(result).toMatchObject({
      name: "Renamed",
      role: UserRole.ADMIN,
      email: "user-2@example.com",
      isActive: true,
      updatedAt: NOW,
    });
    expect(repository.users[1]?.updatedBy).toBe(ADMIN_ID);
  });

  it("locks the user before checking and saving, in one transaction", async () => {
    const { events, update } = setUp();

    await update.execute(change({ email: "new@example.com", role: UserRole.ADMIN }));

    expect(events).toEqual([
      "begin",
      "find user user-2",
      "check email new@example.com",
      "save user user-2",
      "commit",
    ]);
  });

  it("counts the other admins only when the user is an active admin", async () => {
    const { events, update } = setUp([admin(), admin("admin-2")]);

    await update.execute(change({ userId: "admin-2", role: UserRole.SELLER }));

    expect(events).toContain("count admins");
  });

  it("deactivates and reactivates a user", async () => {
    const { update } = setUp();

    await expect(update.execute(change({ isActive: false }))).resolves.toMatchObject({
      isActive: false,
    });
    await expect(update.execute(change({ isActive: true }))).resolves.toMatchObject({
      isActive: true,
    });
  });

  it("saves a change even when the clock gives the time already stored", async () => {
    const { events, update } = setUp([admin(), user("user-2", { updatedAt: NOW })]);

    await update.execute(change({ name: "Renamed" }));

    expect(events).toContain("save user user-2");
  });

  it("saves nothing when nothing changes", async () => {
    const { events, update } = setUp();

    const result = await update.execute(
      change({ email: "USER-2@example.com", name: "User user-2", role: UserRole.SELLER }),
    );

    expect(events).not.toContain("save user user-2");
    expect(result.updatedAt).toEqual(EARLIER);
  });

  it("keeps the email when only its case differs", async () => {
    const { events, update } = setUp();

    await update.execute(change({ email: "User-2@Example.com" }));

    expect(events).not.toContain("check email user-2@example.com");
  });

  describe("an admin on their own account", () => {
    it("cannot change their own role", async () => {
      const { repository, update } = setUp([admin(), admin("admin-2")]);

      await expect(
        update.execute(change({ userId: ADMIN_ID, role: UserRole.SELLER })),
      ).rejects.toThrow(SelfAdministrationError);

      expect(repository.users[0]?.role).toBe(UserRole.ADMIN);
    });

    it("cannot deactivate themselves", async () => {
      const { update } = setUp([admin(), admin("admin-2")]);

      await expect(update.execute(change({ userId: ADMIN_ID, isActive: false }))).rejects.toThrow(
        SelfAdministrationError,
      );
    });

    it("can still change their own name and email", async () => {
      const { update } = setUp();

      await expect(
        update.execute(change({ userId: ADMIN_ID, name: "Me", email: "me@example.com" })),
      ).resolves.toMatchObject({ name: "Me", email: "me@example.com" });
    });

    it("can send their own role unchanged", async () => {
      const { update } = setUp();

      await expect(
        update.execute(change({ userId: ADMIN_ID, role: UserRole.ADMIN, isActive: true })),
      ).resolves.toMatchObject({ role: UserRole.ADMIN });
    });
  });

  it.each([
    ["demoting", { role: UserRole.SELLER }],
    ["deactivating", { isActive: false }],
  ])("refuses %s the last active admin", async (_label, fields) => {
    const { events, update } = setUp([admin(), admin("admin-2", { active: false })]);

    await expect(
      update.execute(change({ actorId: "admin-2", userId: ADMIN_ID, ...fields })),
    ).rejects.toThrow(LastActiveAdminError);

    expect(events.at(-1)).toBe("rollback");
  });

  it("refuses an email another current user has", async () => {
    const { update } = setUp();

    await expect(update.execute(change({ email: "admin-1@example.com" }))).rejects.toThrow(
      EmailAlreadyInUseError,
    );
  });

  it("refuses to edit a deleted user, even with nothing to change", async () => {
    const { update } = setUp([
      admin(),
      user("user-2", { deletedAt: EARLIER, deletedBy: ADMIN_ID, active: false }),
    ]);

    await expect(update.execute(change({}))).rejects.toThrow(DeletedUserError);
  });

  it("fails with USER_NOT_FOUND for an unknown id", async () => {
    const { update } = setUp();

    await expect(update.execute(change({ userId: "nobody" }))).rejects.toThrow(UserNotFoundError);
  });

  it.each([
    ["a malformed email", { email: "nope" }, InvalidEmailError],
    ["a blank name", { name: " " }, InvalidUserNameError],
  ])("refuses %s before opening a transaction", async (_label, fields, error) => {
    const { events, update } = setUp();

    await expect(update.execute(change(fields))).rejects.toThrow(error);

    expect(events).toEqual([]);
  });
});
