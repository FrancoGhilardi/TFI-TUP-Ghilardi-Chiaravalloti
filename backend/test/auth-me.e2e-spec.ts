import type { INestApplication } from "@nestjs/common";
import argon2 from "argon2";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { createTestApp } from "./create-test-app.js";
import { adminPool, truncateAll } from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const PASSWORD = "current-password";
// Access tokens carry whole seconds; the app clock decides them, so the test does too.
const nowInSeconds = () => Math.floor(Date.now() / 1000);

describe("GET /auth/me (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let passwordHash: string;

  beforeAll(async () => {
    pool = adminPool();
    passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  });

  // A fresh app per test starts the login rate limit at zero.
  beforeEach(async () => {
    await truncateAll(pool);
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await pool.end();
  });

  async function insertUser(
    options: { role?: "ADMIN" | "SELLER"; mustChangePassword?: boolean } = {},
  ): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO libreria.users (email, name, password_hash, role, is_active, must_change_password)
       VALUES ('ana@example.com', 'Ana', $1, $2, true, $3) RETURNING id`,
      [passwordHash, options.role ?? "SELLER", options.mustChangePassword ?? false],
    );
    return rows[0].id;
  }

  async function accessToken(): Promise<string> {
    const response = await http
      .post("/api/v1/auth/login")
      .send({ email: "ana@example.com", password: PASSWORD })
      .expect(200);
    return (response.body as { accessToken: string }).accessToken;
  }

  const me = (token?: string) => {
    const pending = http.get("/api/v1/auth/me");
    return token === undefined ? pending : pending.set("Authorization", `Bearer ${token}`);
  };

  describe("returns the authenticated user", () => {
    it.each(["ADMIN", "SELLER"] as const)(
      "with exactly its id, email, name, role and pending change (%s)",
      async (role) => {
        const id = await insertUser({ role });

        const response = await me(await accessToken()).expect(200);

        expect(response.get("Cache-Control")).toBe("no-store");
        expect(response.body).toEqual({
          id,
          email: "ana@example.com",
          name: "Ana",
          role,
          mustChangePassword: false,
        });
      },
    );

    it("also while a password change is pending, and says so", async () => {
      await insertUser({ mustChangePassword: true });

      const response = await me(await accessToken()).expect(200);

      expect(response.body).toMatchObject({ mustChangePassword: true });
    });

    it("as it is now, without a new token after a change to the user", async () => {
      const id = await insertUser({ mustChangePassword: true });
      const token = await accessToken();
      await pool.query(
        "UPDATE libreria.users SET role = 'ADMIN', must_change_password = false WHERE id = $1",
        [id],
      );

      const response = await me(token).expect(200);

      expect(response.body).toMatchObject({ role: "ADMIN", mustChangePassword: false });
    });
  });

  describe("rejects with 401", () => {
    const expectRejected = async (pending: request.Test) => {
      const response = await pending.expect(401);
      expect((response.body as ErrorResponse).code).toBe("INVALID_ACCESS_TOKEN");
    };

    it("without an access token", async () => {
      await expectRejected(me());
    });

    it("with an invalid access token", async () => {
      await expectRejected(me("not-a-token"));
    });

    it.each([
      ["deactivated", "is_active = false"],
      ["deleted", "deleted_at = now()"],
    ])("for a user %s after the login", async (_label, change) => {
      const id = await insertUser();
      const token = await accessToken();
      await pool.query(`UPDATE libreria.users SET ${change} WHERE id = $1`, [id]);

      await expectRejected(me(token));
    });

    it("with a token issued before the password changed", async () => {
      const id = await insertUser();
      const token = await accessToken();
      // A whole second after the token was issued, by the same clock that issued it.
      await pool.query("UPDATE libreria.users SET password_changed_at = $1 WHERE id = $2", [
        new Date((nowInSeconds() + 1) * 1000),
        id,
      ]);

      await expectRejected(me(token));
    });
  });
});
