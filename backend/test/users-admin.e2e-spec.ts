import type { INestApplication } from "@nestjs/common";
import argon2 from "argon2";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AccessTokenService } from "./../src/modules/identity/application/ports/access-token-service.js";
import { UserRepository } from "./../src/modules/identity/domain/repositories/user.repository.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { createTestApp } from "./create-test-app.js";
import { adminPool, truncateAll } from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const UNKNOWN_ID = "4f9c1f43-6f4b-4d5c-9a3e-000000000000";
const TEMPORARY = "temporary-123";

interface UserRow {
  email: string;
  name: string;
  role?: "ADMIN" | "SELLER";
  isActive?: boolean;
  mustChangePassword?: boolean;
  deleted?: boolean;
}

interface UserBody {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

describe("Users admin (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let adminId: string;
  let adminToken: string;

  beforeAll(() => {
    pool = adminPool();
  });

  // A fresh app per test starts the rate limits at zero.
  beforeEach(async () => {
    await truncateAll(pool);
    app = await createTestApp();
    http = request(app.getHttpServer());
    adminId = await insertUser({ email: "admin@example.com", name: "Admin", role: "ADMIN" });
    adminToken = await tokenFor(adminId);
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await pool.end();
  });

  async function insertUser(row: UserRow): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO libreria.users
         (email, name, password_hash, role, is_active, must_change_password, deleted_at)
       VALUES ($1, $2, 'secret-hash', $3, $4, $5, $6) RETURNING id`,
      [
        row.email,
        row.name,
        row.role ?? "SELLER",
        row.deleted ? false : (row.isActive ?? true),
        row.mustChangePassword ?? false,
        row.deleted ? new Date() : null,
      ],
    );
    return rows[0].id;
  }

  async function tokenFor(id: string): Promise<string> {
    const user = await app.get(UserRepository, { strict: false }).findById(id);
    if (!user) throw new Error(`User ${id} not found`);
    return app.get(AccessTokenService, { strict: false }).issue(user).token;
  }

  async function readUser(id: string) {
    const { rows } = await pool.query<{
      role: string;
      is_active: boolean;
      name: string;
      updated_by: string | null;
      created_by: string | null;
      password_hash: string;
    }>(
      "SELECT role, is_active, name, updated_by, created_by, password_hash FROM libreria.users WHERE id = $1",
      [id],
    );
    return rows[0];
  }

  const as = (token: string | undefined, pending: request.Test) =>
    token === undefined ? pending : pending.set("Authorization", `Bearer ${token}`);

  const expectError = async (pending: request.Test, statusCode: number, code: string) => {
    const response = await pending.expect(statusCode);
    expect((response.body as ErrorResponse).code).toBe(code);
    return response;
  };

  describe("is only for admins", () => {
    const routes = [
      ["GET", "/api/v1/admin/users"],
      ["GET", `/api/v1/admin/users/${UNKNOWN_ID}`],
      ["POST", "/api/v1/admin/users"],
      ["PATCH", `/api/v1/admin/users/${UNKNOWN_ID}`],
      ["POST", `/api/v1/admin/users/${UNKNOWN_ID}/reset-password`],
      ["DELETE", `/api/v1/admin/users/${UNKNOWN_ID}`],
      ["POST", `/api/v1/admin/users/${UNKNOWN_ID}/restore`],
    ] as const;
    const call = (method: (typeof routes)[number][0], path: string) => {
      switch (method) {
        case "GET":
          return http.get(path);
        case "POST":
          return http.post(path);
        case "PATCH":
          return http.patch(path);
        case "DELETE":
          return http.delete(path);
      }
    };

    it.each(routes)("%s %s rejects a request without a token", async (method, path) => {
      await expectError(call(method, path), 401, "INVALID_ACCESS_TOKEN");
    });

    it.each(routes)("%s %s rejects a seller", async (method, path) => {
      const seller = await tokenFor(await insertUser({ email: "s@example.com", name: "S" }));

      await expectError(as(seller, call(method, path)), 403, "INSUFFICIENT_ROLE");
    });

    it.each(routes)("%s %s rejects an admin with a pending change", async (method, path) => {
      const pending = await tokenFor(
        await insertUser({
          email: "p@example.com",
          name: "P",
          role: "ADMIN",
          mustChangePassword: true,
        }),
      );

      await expectError(as(pending, call(method, path)), 403, "PASSWORD_CHANGE_REQUIRED");
    });
  });

  it.each([
    ["DELETE", ""],
    ["POST", "restore"],
  ] as const)("answers 501 to %s .../%s, not built yet", async (method, action) => {
    const path = `/api/v1/admin/users/${UNKNOWN_ID}${action ? `/${action}` : ""}`;
    const pending = method === "DELETE" ? http.delete(path) : http.post(path);

    await expectError(as(adminToken, pending), 501, "NOT_IMPLEMENTED");
  });

  describe("GET /admin/users", () => {
    const list = (query = "") => as(adminToken, http.get(`/api/v1/admin/users${query}`));

    beforeEach(async () => {
      await insertUser({ email: "bruno@example.com", name: "Bruno" });
      await insertUser({ email: "carla@example.com", name: "Carla", isActive: false });
      await insertUser({ email: "dario@example.com", name: "Dario", deleted: true });
    });

    it("lists the users not deleted by name, 20 per page, without secrets", async () => {
      const response = await list().expect(200);

      const body = response.body as { items: UserBody[] };
      expect(body).toMatchObject({ page: 1, limit: 20, totalItems: 3, totalPages: 1 });
      expect(body.items.map((user) => user.name)).toEqual(["Admin", "Bruno", "Carla"]);
      expect(Object.keys(body.items[0] ?? {}).sort()).toEqual([
        "createdAt",
        "deletedAt",
        "email",
        "id",
        "isActive",
        "lastLoginAt",
        "mustChangePassword",
        "name",
        "role",
        "updatedAt",
      ]);
      expect(JSON.stringify(body)).not.toContain("secret-hash");
    });

    it.each([
      ["?status=DELETED", ["Dario"]],
      ["?status=INACTIVE", ["Carla"]],
      ["?status=ALL&sortDir=DESC", ["Dario", "Carla", "Bruno", "Admin"]],
      ["?role=ADMIN", ["Admin"]],
      ["?q=CARLA@", ["Carla"]],
    ])("filters with %s", async (query, names) => {
      const response = await list(query).expect(200);

      expect((response.body as { items: UserBody[] }).items.map((user) => user.name)).toEqual(
        names,
      );
    });

    it("pages the results", async () => {
      const response = await list("?page=2&limit=2").expect(200);

      expect(response.body).toMatchObject({
        items: [{ name: "Carla" }],
        page: 2,
        limit: 2,
        totalItems: 3,
        totalPages: 2,
      });
    });

    it.each(["?limit=101", "?page=0", "?status=GONE", "?unknown=1"])(
      "rejects %s",
      async (query) => {
        await expectError(list(query), 400, "VALIDATION_FAILED");
      },
    );
  });

  describe("GET /admin/users/:id", () => {
    it("returns the user, deleted or not", async () => {
      const id = await insertUser({ email: "dario@example.com", name: "Dario", deleted: true });

      const response = await as(adminToken, http.get(`/api/v1/admin/users/${id}`)).expect(200);

      expect(response.body).toMatchObject({ id, name: "Dario", isActive: false });
      expect((response.body as UserBody).deletedAt).not.toBeNull();
    });

    it.each([UNKNOWN_ID, "not-a-uuid"])("answers 404 for %s", async (id) => {
      await expectError(
        as(adminToken, http.get(`/api/v1/admin/users/${id}`)),
        404,
        "USER_NOT_FOUND",
      );
    });
  });

  describe("POST /admin/users", () => {
    const create = (body: Record<string, unknown>) =>
      as(adminToken, http.post("/api/v1/admin/users").send(body));
    const valid = {
      email: "nuevo@example.com",
      name: "Nuevo",
      role: "SELLER",
      temporaryPassword: TEMPORARY,
    };

    it("creates an active user who must change the password on the first login", async () => {
      const response = await create(valid).expect(201);

      const body = response.body as UserBody;
      expect(body).toMatchObject({
        email: "nuevo@example.com",
        name: "Nuevo",
        role: "SELLER",
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: null,
        deletedAt: null,
      });
      const stored = await readUser(body.id);
      expect(stored?.created_by).toBe(adminId);
      expect(await argon2.verify(stored?.password_hash ?? "", TEMPORARY)).toBe(true);

      const loggedIn = await http
        .post("/api/v1/auth/login")
        .send({ email: "nuevo@example.com", password: TEMPORARY })
        .expect(200);
      expect(loggedIn.body).toMatchObject({ user: { mustChangePassword: true } });
    });

    it("refuses an email a current user has, whatever its case", async () => {
      await expectError(
        create({ ...valid, email: "ADMIN@example.com" }),
        409,
        "EMAIL_ALREADY_IN_USE",
      );
    });

    it.each([
      ["a malformed email", { email: "nope" }, "INVALID_EMAIL"],
      ["a password that breaks the policy", { temporaryPassword: "short" }, "INVALID_PASSWORD"],
      ["an unknown role", { role: "OWNER" }, "VALIDATION_FAILED"],
      ["an unknown field", { nickname: "x" }, "VALIDATION_FAILED"],
    ])("refuses %s", async (_label, change, code) => {
      await expectError(create({ ...valid, ...change }), 400, code);
    });
  });

  describe("PATCH /admin/users/:id", () => {
    let sellerId: string;
    const update = (id: string, body: Record<string, unknown>) =>
      as(adminToken, http.patch(`/api/v1/admin/users/${id}`).send(body));

    beforeEach(async () => {
      sellerId = await insertUser({ email: "bruno@example.com", name: "Bruno" });
    });

    it("changes only the fields sent, on behalf of the admin", async () => {
      const response = await update(sellerId, { name: "Bruno M." }).expect(200);

      expect(response.body).toMatchObject({
        name: "Bruno M.",
        email: "bruno@example.com",
        role: "SELLER",
      });
      expect((await readUser(sellerId))?.updated_by).toBe(adminId);
    });

    it("revokes the sessions of a user whose role or status changes", async () => {
      await pool.query(
        `INSERT INTO libreria.sessions (user_id, refresh_token_hash, family_id, expires_at)
         VALUES ($1, 'token-hash', gen_random_uuid(), now() + interval '1 day')`,
        [sellerId],
      );

      await update(sellerId, { role: "ADMIN" }).expect(200);

      const { rows } = await pool.query<{ revoked_at: Date | null }>(
        "SELECT revoked_at FROM libreria.sessions WHERE user_id = $1",
        [sellerId],
      );
      expect(rows[0]?.revoked_at).not.toBeNull();
    });

    it("does not let an admin change their own role", async () => {
      await expectError(update(adminId, { role: "SELLER" }), 422, "SELF_ADMINISTRATION");

      expect((await readUser(adminId))?.role).toBe("ADMIN");
    });

    it("does not let an admin deactivate themselves", async () => {
      await expectError(update(adminId, { isActive: false }), 422, "SELF_ADMINISTRATION");

      expect((await readUser(adminId))?.is_active).toBe(true);
    });

    it("lets an admin change their own name", async () => {
      await update(adminId, { name: "Admin Principal" }).expect(200);
    });

    it("refuses an email a current user has", async () => {
      await expectError(
        update(sellerId, { email: "admin@example.com" }),
        409,
        "EMAIL_ALREADY_IN_USE",
      );
    });

    it("refuses to edit a deleted user", async () => {
      const deleted = await insertUser({ email: "d@example.com", name: "D", deleted: true });

      await expectError(update(deleted, { name: "Back" }), 422, "USER_DELETED");
    });

    it("refuses a field sent as null instead of skipping it", async () => {
      await expectError(update(sellerId, { name: null }), 400, "VALIDATION_FAILED");
    });

    it.each([UNKNOWN_ID, "not-a-uuid"])("answers 404 for %s", async (id) => {
      await expectError(update(id, { name: "X" }), 404, "USER_NOT_FOUND");
    });
  });
});
