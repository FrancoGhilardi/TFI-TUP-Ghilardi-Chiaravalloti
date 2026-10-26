import type { ConfigService } from "@nestjs/config";
import type { Pool } from "pg";
import type { Env } from "../../src/config/env.js";
import type { ListUsersQuery } from "../../src/modules/identity/application/dto/list-users.query.js";
import { UserRole } from "../../src/modules/identity/domain/user-role.js";
import { DrizzleUserQueries } from "../../src/modules/identity/infrastructure/persistence/drizzle-user.queries.js";
import { RecordStatusFilter, SortDirection } from "../../src/shared/application/pagination.js";
import { DrizzleClient } from "../../src/shared/infrastructure/database/drizzle.client.js";
import { DrizzleExecutor } from "../../src/shared/infrastructure/database/drizzle.executor.js";
import { adminPool, truncateAll } from "./db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

interface Row {
  name: string;
  email: string;
  role?: "ADMIN" | "SELLER";
  isActive?: boolean;
  deleted?: boolean;
}

describe("DrizzleUserQueries (e2e)", () => {
  let pool: Pool;
  let client: DrizzleClient;
  let queries: DrizzleUserQueries;

  beforeAll(() => {
    pool = adminPool();
    // Runs with the runtime role, so it also checks that role can read the table.
    const values: Record<string, unknown> = {
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_SSL_MODE: process.env.DATABASE_SSL_MODE ?? "disable",
      DATABASE_SSL_CA: process.env.DATABASE_SSL_CA,
      DATABASE_POOL_MAX: 2,
    };
    client = new DrizzleClient({ get: (key: string) => values[key] } as ConfigService<Env, true>);
    queries = new DrizzleUserQueries(new DrizzleExecutor(client));
  });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await truncateAll(pool);
    await client.onApplicationShutdown();
    await pool.end();
  });

  async function insert(row: Row): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO libreria.users
         (email, name, password_hash, role, is_active, must_change_password, deleted_at)
       VALUES ($1, $2, 'secret-hash', $3, $4, true, $5) RETURNING id`,
      [
        row.email,
        row.name,
        row.role ?? "SELLER",
        row.deleted ? false : (row.isActive ?? true),
        row.deleted ? new Date() : null,
      ],
    );
    return rows[0].id;
  }

  const list = (query: Partial<ListUsersQuery> = {}) =>
    queries.findPage({ page: 1, limit: 20, sortDir: SortDirection.ASC, ...query });

  const names = async (query: Partial<ListUsersQuery> = {}) =>
    (await list(query)).items.map((user) => user.name);

  describe("findPage", () => {
    beforeEach(async () => {
      await insert({ name: "Bruno", email: "bruno@example.com", role: "ADMIN" });
      await insert({ name: "ana", email: "ana@example.com" });
      await insert({ name: "Carla", email: "carla@example.com", isActive: false });
      await insert({ name: "Dario", email: "dario@example.com", deleted: true });
    });

    it("lists the users not deleted by name, ignoring case", async () => {
      await expect(names()).resolves.toEqual(["ana", "Bruno", "Carla"]);
    });

    it("sorts by name the other way when asked", async () => {
      await expect(names({ sortDir: SortDirection.DESC })).resolves.toEqual([
        "Carla",
        "Bruno",
        "ana",
      ]);
    });

    it("breaks ties with the email, so pages never overlap", async () => {
      await insert({ name: "Ana", email: "a-second@example.com" });

      await expect(list()).resolves.toMatchObject({
        items: [{ email: "a-second@example.com" }, { email: "ana@example.com" }, {}, {}],
      });
    });

    it.each([
      [RecordStatusFilter.ACTIVE, ["ana", "Bruno"]],
      [RecordStatusFilter.INACTIVE, ["Carla"]],
      [RecordStatusFilter.DELETED, ["Dario"]],
      [RecordStatusFilter.ALL, ["ana", "Bruno", "Carla", "Dario"]],
    ])("filters by status %s", async (status, expected) => {
      await expect(names({ status })).resolves.toEqual(expected);
    });

    it("filters by role", async () => {
      await expect(names({ role: UserRole.ADMIN })).resolves.toEqual(["Bruno"]);
    });

    it.each([
      ["part of the name, in any case", "BRU", ["Bruno"]],
      ["part of the email", "carla@", ["Carla"]],
      ["text around spaces", "  ana  ", ["ana"]],
      ["nothing but spaces", "   ", ["ana", "Bruno", "Carla"]],
    ])("searches %s", async (_label, q, expected) => {
      await expect(names({ q })).resolves.toEqual(expected);
    });

    it("searches wildcards as the characters they are", async () => {
      await insert({ name: "100% Real", email: "real@example.com" });
      await insert({ name: "Under_score", email: "under@example.com" });

      await expect(names({ q: "%" })).resolves.toEqual(["100% Real"]);
      await expect(names({ q: "_" })).resolves.toEqual(["Under_score"]);
    });

    it("pages the results and counts all of them", async () => {
      await expect(list({ page: 2, limit: 2 })).resolves.toMatchObject({
        items: [{ name: "Carla" }],
        page: 2,
        limit: 2,
        totalItems: 3,
        totalPages: 2,
      });
    });

    it("gives an empty page past the last one, with the totals", async () => {
      await expect(list({ page: 9, limit: 2 })).resolves.toMatchObject({
        items: [],
        totalItems: 3,
        totalPages: 2,
      });
    });
  });

  describe("findById", () => {
    it("returns what the panel shows, never the hashes", async () => {
      const id = await insert({ name: "Ana", email: "ana@example.com", role: "ADMIN" });

      const user = await queries.findById(id);

      expect(user).toEqual({
        id,
        email: "ana@example.com",
        name: "Ana",
        role: UserRole.ADMIN,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: null,
        createdAt: expect.any(Date) as Date,
        updatedAt: expect.any(Date) as Date,
        deletedAt: null,
      });
      expect(JSON.stringify(user)).not.toContain("secret-hash");
    });

    it("finds a deleted user too", async () => {
      const id = await insert({ name: "Dario", email: "dario@example.com", deleted: true });

      await expect(queries.findById(id)).resolves.toMatchObject({
        isActive: false,
        deletedAt: expect.any(Date) as Date,
      });
    });

    it("returns null for an unknown id", async () => {
      await expect(queries.findById("4f9c1f43-6f4b-4d5c-9a3e-000000000000")).resolves.toBeNull();
    });
  });
});
