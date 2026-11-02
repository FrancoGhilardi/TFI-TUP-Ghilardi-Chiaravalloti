import { type Page, SortDirection } from "../../../../shared/application/pagination.js";
import { UserRole } from "../../domain/user-role.js";
import type { ListUsersQuery } from "../dto/list-users.query.js";
import type { UserResult } from "../dto/user.result.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import { UserQueries } from "../ports/user-queries.js";
import { GetUserUseCase } from "./get-user.use-case.js";
import { ListUsersUseCase } from "./list-users.use-case.js";

const ANA: UserResult = {
  id: "user-1",
  email: "ana@example.com",
  name: "Ana",
  role: UserRole.SELLER,
  isActive: true,
  mustChangePassword: false,
  lastLoginAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  deletedAt: null,
};

class FakeUserQueries extends UserQueries {
  readonly asked: ListUsersQuery[] = [];

  findPage(query: ListUsersQuery): Promise<Page<UserResult>> {
    this.asked.push(query);
    return Promise.resolve({ items: [ANA], page: 1, limit: 20, totalItems: 1, totalPages: 1 });
  }

  findById(id: string): Promise<UserResult | null> {
    return Promise.resolve(id === ANA.id ? ANA : null);
  }
}

describe("ListUsersUseCase", () => {
  it("returns the page the queries give for the same query", async () => {
    const queries = new FakeUserQueries();
    const query = { page: 1, limit: 20, sortDir: SortDirection.ASC, q: "ana" };

    const page = await new ListUsersUseCase(queries).execute(query);

    expect(queries.asked).toEqual([query]);
    expect(page.items).toEqual([ANA]);
  });
});

describe("GetUserUseCase", () => {
  it("returns the user", async () => {
    await expect(new GetUserUseCase(new FakeUserQueries()).execute("user-1")).resolves.toBe(ANA);
  });

  it("fails with USER_NOT_FOUND for an unknown id", async () => {
    await expect(new GetUserUseCase(new FakeUserQueries()).execute("nobody")).rejects.toThrow(
      UserNotFoundError,
    );
  });
});
