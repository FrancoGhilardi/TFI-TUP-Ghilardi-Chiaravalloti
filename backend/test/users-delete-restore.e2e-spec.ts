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

const PASSWORD = "current-password";
const UNKNOWN_ID = "4f9c1f43-6f4b-4d5c-9a3e-000000000000";

interface UserRow {
  is_active: boolean;
  deleted_at: Date | null;
  deleted_by: string | null;
  updated_by: string | null;
  password_hash: string;
}

describe("Users delete and restore (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let passwordHash: string;
  let adminId: string;
  let adminToken: string;
  let userId: string;

  beforeAll(async () => {
    pool = adminPool();
    passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  });

  // A fresh app per test starts the rate limits at zero.
  beforeEach(async () => {
    await truncateAll(pool);
    app = await createTestApp();
    http = request(app.getHttpServer());
    adminId = await insertUser("admin@example.com", { role: "ADMIN" });
    adminToken = await tokenFor(adminId);
    userId = await insertUser("ana@example.com");
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await pool.end();
  });

  async function insertUser(
    email: string,
    options: { role?: "ADMIN" | "SELLER"; isActive?: boolean } = {},
  ): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO libreria.users (email, name, password_hash, role, is_active, must_change_password)
       VALUES ($1, 'Ana', $2, $3, $4, false) RETURNING id`,
      [email, passwordHash, options.role ?? "SELLER", options.isActive ?? true],
    );
    return rows[0].id;
  }

  async function tokenFor(id: string): Promise<string> {
    const user = await app.get(UserRepository, { strict: false }).findById(id);
    if (!user) throw new Error(`User ${id} not found`);
    return app.get(AccessTokenService, { strict: false }).issue(user).token;
  }

  async function readUser(id = userId): Promise<UserRow> {
    const { rows } = await pool.query<UserRow>(
      `SELECT is_active, deleted_at, deleted_by, updated_by, password_hash
       FROM libreria.users WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  const remove = (id = userId, token = adminToken) =>
    http.delete(`/api/v1/admin/users/${id}`).set("Authorization", `Bearer ${token}`);

  const restore = (id = userId, token = adminToken) =>
    http.post(`/api/v1/admin/users/${id}/restore`).set("Authorization", `Bearer ${token}`);

  const login = (email = "ana@example.com") =>
    http.post("/api/v1/auth/login").send({ email, password: PASSWORD });

  const expectError = async (pending: request.Test, statusCode: number, code: string) => {
    const response = await pending.expect(statusCode);
    expect((response.body as ErrorResponse).code).toBe(code);
  };

  describe("DELETE /admin/users/:id", () => {
    it("deletes the user logically, with the date and the admin", async () => {
      const before = Date.now();

      const response = await remove().expect(204);

      expect(response.text).toBe("");
      const user = await readUser();
      expect(user.is_active).toBe(false);
      expect(user.deleted_by).toBe(adminId);
      expect(user.deleted_at?.getTime()).toBeGreaterThanOrEqual(before - 1000);
    });

    it("ends the sessions of the user, who can no longer log in", async () => {
      await pool.query(
        `INSERT INTO libreria.sessions (user_id, refresh_token_hash, family_id, expires_at)
         VALUES ($1, 'token-hash', gen_random_uuid(), now() + interval '1 day')`,
        [userId],
      );

      await remove().expect(204);

      const { rows } = await pool.query<{ revoked_at: Date | null }>(
        "SELECT revoked_at FROM libreria.sessions WHERE user_id = $1",
        [userId],
      );
      expect(rows[0]?.revoked_at).not.toBeNull();
      await login().expect(401);
    });

    it("leaves the listing, where it shows up when asked for", async () => {
      await remove().expect(204);

      const listed = await http
        .get("/api/v1/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      const deleted = await http
        .get("/api/v1/admin/users?status=DELETED")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      const ids = (body: unknown) => (body as { items: { id: string }[] }).items.map((u) => u.id);
      expect(ids(listed.body)).not.toContain(userId);
      expect(ids(deleted.body)).toEqual([userId]);
    });

    it("frees the email for another user", async () => {
      await remove().expect(204);

      await http
        .post("/api/v1/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "ana@example.com",
          name: "Otra Ana",
          role: "SELLER",
          temporaryPassword: "temporary-123",
        })
        .expect(201);
    });

    it("answers the same to a second deletion, keeping the first date and author", async () => {
      await remove().expect(204);
      const first = await readUser();

      await remove().expect(204);

      expect(await readUser()).toEqual(first);
    });

    it.each([
      ["another active admin", { role: "ADMIN" as const }],
      ["an inactive admin", { role: "ADMIN" as const, isActive: false }],
    ])("deletes %s", async (_label, options) => {
      const other = await insertUser("other@example.com", options);

      await remove(other).expect(204);

      expect((await readUser(other)).deleted_at).not.toBeNull();
    });

    it("does not let an admin delete themselves", async () => {
      await expectError(remove(adminId), 422, "SELF_ADMINISTRATION");

      expect((await readUser(adminId)).deleted_at).toBeNull();
    });

    it.each([UNKNOWN_ID, "not-a-uuid"])("answers 404 for %s", async (id) => {
      await expectError(remove(id), 404, "USER_NOT_FOUND");
    });
  });

  describe("POST /admin/users/:id/restore", () => {
    it("restores the user, active again, who logs in with the same password", async () => {
      await remove().expect(204);

      const response = await restore().expect(200);

      expect(response.body).toMatchObject({ id: userId, isActive: true, deletedAt: null });
      const user = await readUser();
      expect(user).toMatchObject({
        deleted_by: null,
        updated_by: adminId,
        password_hash: passwordHash,
      });
      await login().expect(200);
    });

    it("refuses a user that is not deleted", async () => {
      await expectError(restore(), 422, "USER_NOT_DELETED");
    });

    it("refuses when another current user has taken the email", async () => {
      await remove().expect(204);
      await insertUser("ana@example.com");

      await expectError(restore(), 409, "EMAIL_ALREADY_IN_USE");

      expect((await readUser()).deleted_at).not.toBeNull();
    });

    it.each([UNKNOWN_ID, "not-a-uuid"])("answers 404 for %s", async (id) => {
      await expectError(restore(id), 404, "USER_NOT_FOUND");
    });
  });

  it.each([
    ["DELETE", (token: string) => remove(userId, token)],
    ["restore", (token: string) => restore(userId, token)],
  ])("rejects a seller on %s", async (_label, call) => {
    const seller = await tokenFor(await insertUser("seller@example.com"));

    await expectError(call(seller), 403, "INSUFFICIENT_ROLE");
  });
});
