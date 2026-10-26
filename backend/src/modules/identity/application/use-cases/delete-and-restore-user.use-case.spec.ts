import { Clock } from "../../../../shared/application/clock.js";
import type { Page } from "../../../../shared/application/pagination.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { User, type UserProps } from "../../domain/entities/user.js";
import { EmailAlreadyInUseError } from "../../domain/errors/email-already-in-use-error.js";
import { LastActiveAdminError } from "../../domain/errors/last-active-admin-error.js";
import { SelfAdministrationError } from "../../domain/errors/self-administration-error.js";
import { UserNotDeletedError } from "../../domain/errors/user-not-deleted-error.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { UserAdministrationPolicy } from "../../domain/services/user-administration.policy.js";
import { UserRole } from "../../domain/user-role.js";
import { Email } from "../../domain/value-objects/email.js";
import { UserName } from "../../domain/value-objects/user-name.js";
import type { UserResult } from "../dto/user.result.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import { UserQueries } from "../ports/user-queries.js";
import { DeleteUserUseCase } from "./delete-user.use-case.js";
import { RestoreUserUseCase } from "./restore-user.use-case.js";

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
    return Promise.resolve();
  }

  findByEmail(): Promise<User | null> {
    return Promise.reject(new Error("Not used"));
  }
}

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
            lastLoginAt: null,
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

function user(id: string, overrides: Partial<UserProps> = {}): User {
  return User.reconstitute({
    id,
    email: Email.create(`${id}@example.com`),
    name: UserName.create(`User ${id}`),
    passwordHash: "hashed:own-password",
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

const deleted = (id: string, overrides: Partial<UserProps> = {}) =>
  user(id, { active: false, deletedAt: EARLIER, deletedBy: "admin-0", ...overrides });

function setUp(users: User[]) {
  const events: string[] = [];
  const repository = new InMemoryUserRepository(users, events);
  const transaction = new RecordingTransaction(events);
  const remove = new DeleteUserUseCase(
    repository,
    new UserAdministrationPolicy(),
    transaction,
    new FixedClock(),
  );
  const restore = new RestoreUserUseCase(
    repository,
    new RepositoryBackedQueries(repository),
    transaction,
    new FixedClock(),
  );
  const find = (id: string) => repository.users.find((stored) => stored.getId() === id);
  return { events, remove, restore, find };
}

describe("DeleteUserUseCase", () => {
  const deleteUser = (useCase: DeleteUserUseCase, userId: string, actorId = ADMIN_ID) =>
    useCase.execute({ actorId, userId });

  it("deletes a user with the date and the admin, leaving it inactive", async () => {
    const { remove, find } = setUp([admin(), user("user-2")]);

    await deleteUser(remove, "user-2");

    expect(find("user-2")).toMatchObject({
      deletedAt: NOW,
      deletedBy: ADMIN_ID,
      active: false,
      updatedBy: ADMIN_ID,
    });
  });

  it("locks the user, then saves, in one transaction", async () => {
    const { events, remove } = setUp([admin(), user("user-2")]);

    await deleteUser(remove, "user-2");

    expect(events).toEqual(["begin", "find user user-2", "save user user-2", "commit"]);
  });

  it("deletes another active admin, counting the admins left", async () => {
    const { events, remove, find } = setUp([admin(), admin("admin-2")]);

    await deleteUser(remove, "admin-2");

    expect(events).toContain("count admins");
    expect(find("admin-2")?.isDeleted()).toBe(true);
  });

  it("deletes an inactive admin without counting", async () => {
    const { events, remove } = setUp([admin(), admin("admin-2", { active: false })]);

    await deleteUser(remove, "admin-2");

    expect(events).not.toContain("count admins");
  });

  it("does not let an admin delete themselves", async () => {
    const { events, remove, find } = setUp([admin(), admin("admin-2")]);

    await expect(deleteUser(remove, ADMIN_ID)).rejects.toThrow(SelfAdministrationError);

    expect(find(ADMIN_ID)?.isDeleted()).toBe(false);
    expect(events).not.toContain(`save user ${ADMIN_ID}`);
  });

  it("never leaves the system without an active admin", async () => {
    // Only reachable through the use case: the API always has an acting active admin.
    const { events, remove } = setUp([admin(), admin("admin-2", { active: false })]);

    await expect(deleteUser(remove, ADMIN_ID, "admin-2")).rejects.toThrow(LastActiveAdminError);

    expect(events.at(-1)).toBe("rollback");
  });

  it("changes nothing for a user already deleted", async () => {
    const { events, remove, find } = setUp([admin(), deleted("user-2")]);

    await expect(deleteUser(remove, "user-2")).resolves.toBeUndefined();

    expect(find("user-2")).toMatchObject({ deletedAt: EARLIER, deletedBy: "admin-0" });
    expect(events).not.toContain("save user user-2");
  });

  it("fails with USER_NOT_FOUND for an unknown id", async () => {
    const { remove } = setUp([admin()]);

    await expect(deleteUser(remove, "nobody")).rejects.toThrow(UserNotFoundError);
  });
});

describe("RestoreUserUseCase", () => {
  const restoreUser = (useCase: RestoreUserUseCase, userId: string) =>
    useCase.execute({ actorId: ADMIN_ID, userId });

  it("clears the deletion and activates the user, keeping its password", async () => {
    const { restore, find } = setUp([admin(), deleted("user-2", { mustChangePassword: true })]);

    const result = await restoreUser(restore, "user-2");

    expect(result).toMatchObject({ id: "user-2", isActive: true, deletedAt: null });
    expect(find("user-2")).toMatchObject({
      deletedAt: undefined,
      deletedBy: undefined,
      updatedBy: ADMIN_ID,
      passwordHash: "hashed:own-password",
      mustChangePassword: true,
    });
  });

  it("checks the email with the user locked, then saves", async () => {
    const { events, restore } = setUp([admin(), deleted("user-2")]);

    await restoreUser(restore, "user-2");

    expect(events).toEqual([
      "begin",
      "find user user-2",
      "check email user-2@example.com",
      "save user user-2",
      "commit",
    ]);
  });

  it("refuses a user that is not deleted", async () => {
    const { restore } = setUp([admin(), user("user-2")]);

    await expect(restoreUser(restore, "user-2")).rejects.toThrow(UserNotDeletedError);
  });

  it("refuses when another current user has taken the email", async () => {
    const taken = user("user-3", { email: Email.create("user-2@example.com") });
    const { events, restore } = setUp([admin(), deleted("user-2"), taken]);

    await expect(restoreUser(restore, "user-2")).rejects.toThrow(EmailAlreadyInUseError);

    // The restore made in memory is rolled back, never saved.
    expect(events).not.toContain("save user user-2");
    expect(events.at(-1)).toBe("rollback");
  });

  it("fails with USER_NOT_FOUND for an unknown id", async () => {
    const { restore } = setUp([admin()]);

    await expect(restoreUser(restore, "nobody")).rejects.toThrow(UserNotFoundError);
  });
});
