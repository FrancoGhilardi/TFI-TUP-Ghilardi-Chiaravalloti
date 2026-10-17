import { User, type UserProps } from "../../domain/entities/user.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { UserRole } from "../../domain/user-role.js";
import { Email } from "../../domain/value-objects/email.js";
import { InvalidAccessTokenError } from "../errors/invalid-access-token-error.js";
import { ResolveAuthenticatedUserUseCase } from "./resolve-authenticated-user.use-case.js";

class InMemoryUserRepository extends UserRepository {
  constructor(private readonly users: User[] = []) {
    super();
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.find((user) => user.getId() === id) ?? null);
  }
}

const PASSWORD_CHANGED_AT = new Date("2026-10-17T12:00:00.400Z");

function user(overrides: Partial<UserProps> = {}): User {
  return User.reconstitute({
    id: "user-1",
    email: Email.create("ana@example.com"),
    name: "Ana",
    passwordHash: "hash",
    role: UserRole.ADMIN,
    active: true,
    mustChangePassword: true,
    passwordChangedAt: PASSWORD_CHANGED_AT,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });
}

function resolve(users: User[], tokenIssuedAt = new Date("2026-10-17T13:00:00.000Z")) {
  return new ResolveAuthenticatedUserUseCase(new InMemoryUserRepository(users)).execute({
    userId: "user-1",
    tokenIssuedAt,
  });
}

describe("ResolveAuthenticatedUserUseCase", () => {
  it("returns the current data of the user, read from the repository", async () => {
    await expect(resolve([user({ role: UserRole.SELLER })])).resolves.toEqual({
      id: "user-1",
      email: "ana@example.com",
      name: "Ana",
      role: UserRole.SELLER,
      mustChangePassword: true,
    });
  });

  it.each([
    ["the user does not exist", []],
    ["the user is inactive", [user({ active: false })]],
    ["the user was deleted", [user({ deletedAt: new Date("2026-10-01") })]],
  ])("rejects when %s", async (_label, users) => {
    await expect(resolve(users)).rejects.toThrow(InvalidAccessTokenError);
  });

  it("rejects a token issued before the last password change", async () => {
    await expect(resolve([user()], new Date("2026-10-17T11:59:59.999Z"))).rejects.toThrow(
      InvalidAccessTokenError,
    );
  });

  it("accepts a token issued in the same second as the password change", async () => {
    await expect(resolve([user()], new Date("2026-10-17T12:00:00.000Z"))).resolves.toMatchObject({
      id: "user-1",
    });
  });

  it("accepts any token when the password never changed", async () => {
    await expect(
      resolve([user({ passwordChangedAt: undefined })], new Date("2000-01-01T00:00:00.000Z")),
    ).resolves.toMatchObject({ id: "user-1" });
  });

  it("rejects every cause with the same code and message", async () => {
    const causes = [
      resolve([]),
      resolve([user({ active: false })]),
      resolve([user({ deletedAt: new Date() })]),
      resolve([user()], new Date("2026-10-17T11:00:00.000Z")),
    ];

    for (const cause of causes) {
      await expect(cause).rejects.toMatchObject({
        code: "INVALID_ACCESS_TOKEN",
        message: "Tu sesión no es válida o venció. Iniciá sesión de nuevo.",
      });
    }
  });
});
