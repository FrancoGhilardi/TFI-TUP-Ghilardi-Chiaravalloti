import { createHash } from "node:crypto";
import { Controller, Get, type INestApplication } from "@nestjs/common";
import argon2 from "argon2";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import { UserRole } from "./../src/modules/identity/domain/user-role.js";
import type { AuthUser } from "./../src/modules/identity/presentation/auth-user.js";
import { AllowPendingPasswordChange } from "./../src/modules/identity/presentation/decorators/allow-pending-password-change.decorator.js";
import { CurrentUser } from "./../src/modules/identity/presentation/decorators/current-user.decorator.js";
import { Roles } from "./../src/modules/identity/presentation/decorators/roles.decorator.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { createTestApp } from "./create-test-app.js";
import { adminPool, truncateAll } from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

@Controller("login-probe")
class LoginProbeController {
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @AllowPendingPasswordChange()
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}

const INVALID_CREDENTIALS = {
  statusCode: 401,
  code: "INVALID_CREDENTIALS",
  message: "El email o la contraseña no son correctos.",
  path: "/api/v1/auth/login",
};
const PASSWORD = "current-password";
const TEMPORARY = "temporary-password";
const HOUR_MS = 3_600_000;

interface UserRow {
  email?: string;
  isActive?: boolean;
  deletedAt?: Date | null;
  temporaryExpiresAt?: Date | null;
}

describe("Login (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let hashes: { password: string; temporary: string };

  beforeAll(async () => {
    pool = adminPool();
    hashes = {
      password: await argon2.hash(PASSWORD, { type: argon2.argon2id }),
      temporary: await argon2.hash(TEMPORARY, { type: argon2.argon2id }),
    };
  });

  // A fresh app per test starts the login rate limit at zero.
  beforeEach(async () => {
    await truncateAll(pool);
    app = await createTestApp({ controllers: [LoginProbeController] });
    http = request(app.getHttpServer());
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await pool.end();
  });

  async function insertUser(row: UserRow = {}): Promise<string> {
    const temporaryExpiresAt = row.temporaryExpiresAt ?? null;
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO libreria.users
         (email, name, password_hash, role, is_active, must_change_password, deleted_at,
          temporary_password_hash, temporary_password_expires_at)
       VALUES ($1, 'Ana', $2, 'SELLER', $3, false, $4, $5, $6) RETURNING id`,
      [
        row.email ?? "ana@example.com",
        hashes.password,
        row.isActive ?? true,
        row.deletedAt ?? null,
        temporaryExpiresAt && hashes.temporary,
        temporaryExpiresAt,
      ],
    );
    return rows[0].id;
  }

  async function readUser(id: string) {
    const { rows } = await pool.query<{
      password_hash: string;
      must_change_password: boolean;
      temporary_password_hash: string | null;
      last_login_at: Date | null;
    }>(
      `SELECT password_hash, must_change_password, temporary_password_hash, last_login_at
       FROM libreria.users WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  const login = (email: string, password: string) =>
    http.post("/api/v1/auth/login").send({ email, password });

  const accessTokenOf = (response: request.Response) =>
    (response.body as { accessToken: string }).accessToken;

  const refreshCookie = (response: request.Response) => {
    const header = response.headers["set-cookie"] as unknown as string[] | undefined;
    return header?.find((cookie) => cookie.startsWith("__Secure-refresh_token="));
  };

  describe("with the current password", () => {
    it("returns the access token and the user, without the refresh token", async () => {
      const id = await insertUser();

      const response = await login("ana@example.com", PASSWORD).expect(200);

      expect(response.get("Cache-Control")).toBe("no-store");
      expect(response.body).toEqual({
        accessToken: expect.any(String) as string,
        expiresIn: 900,
        user: {
          id,
          email: "ana@example.com",
          name: "Ana",
          role: UserRole.SELLER,
          mustChangePassword: false,
        },
      });
      const refreshToken = /^__Secure-refresh_token=([^;]+)/.exec(refreshCookie(response) ?? "");
      expect(JSON.stringify(response.body)).not.toContain(refreshToken?.[1]);
    });

    it("leaves the refresh token in a secure cookie and only its hash in the database", async () => {
      const id = await insertUser();
      const before = Date.now();

      const response = await login("ana@example.com", PASSWORD).set("User-Agent", "Firefox");

      const cookie = refreshCookie(response) ?? "";
      const [pair, ...attributes] = cookie.split("; ");
      const token = pair?.split("=")[1] ?? "";
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(attributes).toEqual(
        expect.arrayContaining(["Path=/api/v1/auth", "HttpOnly", "Secure", "SameSite=Strict"]),
      );
      expect(cookie).not.toMatch(/Domain=/i);

      const { rows } = await pool.query<{
        refresh_token_hash: string;
        expires_at: Date;
        user_agent: string;
      }>(
        "SELECT refresh_token_hash, expires_at, user_agent FROM libreria.sessions WHERE user_id = $1",
        [id],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.refresh_token_hash).toBe(createHash("sha256").update(token).digest("hex"));
      expect(rows[0]?.user_agent).toBe("Firefox");
      // A week by default, and the cookie expires with the session.
      const expiresAt = rows[0]?.expires_at.getTime() ?? 0;
      expect(expiresAt - before).toBeGreaterThanOrEqual(7 * 24 * HOUR_MS - 1_000);
      expect(expiresAt - before).toBeLessThanOrEqual(7 * 24 * HOUR_MS + 5_000);
      const expires = attributes.find((attribute) => attribute.startsWith("Expires="));
      expect(new Date(expires?.slice("Expires=".length) ?? "").getTime()).toBe(
        Math.floor(expiresAt / 1000) * 1000,
      );
    });

    it("issues an access token that opens the protected endpoints", async () => {
      const id = await insertUser();
      const accessToken = accessTokenOf(await login("ana@example.com", PASSWORD));

      const response = await http
        .get("/api/v1/login-probe/me")
        .auth(accessToken, { type: "bearer" })
        .expect(200);

      expect(response.body).toMatchObject({ id, role: UserRole.SELLER });
    });

    it("records the login time", async () => {
      const id = await insertUser();
      const before = Date.now();

      await login("ana@example.com", PASSWORD).expect(200);

      const lastLoginAt = (await readUser(id))?.last_login_at?.getTime() ?? 0;
      expect(lastLoginAt).toBeGreaterThanOrEqual(before - 1_000);
      expect(lastLoginAt).toBeLessThanOrEqual(Date.now() + 1_000);
    });

    it("accepts the email with spaces around it and in any case", async () => {
      await insertUser();

      await login("  ANA@Example.com ", PASSWORD).expect(200);
    });

    it("discards a temporary password still pending", async () => {
      const id = await insertUser({ temporaryExpiresAt: new Date(Date.now() + HOUR_MS) });

      await login("ana@example.com", PASSWORD).expect(200);

      expect((await readUser(id))?.temporary_password_hash).toBeNull();
      await login("ana@example.com", TEMPORARY).expect(401);
    });

    it("stores the user agent cut to 500 characters", async () => {
      const id = await insertUser();

      await login("ana@example.com", PASSWORD).set("User-Agent", "a".repeat(600)).expect(200);

      const { rows } = await pool.query<{ user_agent: string }>(
        "SELECT user_agent FROM libreria.sessions WHERE user_id = $1",
        [id],
      );
      expect(rows[0]?.user_agent).toBe("a".repeat(500));
    });
  });

  describe("with the temporary password", () => {
    it("logs in, makes it the password and asks to change it", async () => {
      const id = await insertUser({ temporaryExpiresAt: new Date(Date.now() + HOUR_MS) });

      const response = await login("ana@example.com", TEMPORARY).expect(200);

      expect(response.body).toMatchObject({ user: { id, mustChangePassword: true } });
      expect(refreshCookie(response)).toBeDefined();
      const user = await readUser(id);
      expect(user?.password_hash).toBe(hashes.temporary);
      expect(user?.must_change_password).toBe(true);
      expect(user?.temporary_password_hash).toBeNull();
      expect(user?.last_login_at).not.toBeNull();
    });

    it("leaves the previous password unusable", async () => {
      await insertUser({ temporaryExpiresAt: new Date(Date.now() + HOUR_MS) });
      await login("ana@example.com", TEMPORARY).expect(200);

      await login("ana@example.com", PASSWORD).expect(401);
    });

    it("issues a token that is valid right away, although the password just changed", async () => {
      await insertUser({ temporaryExpiresAt: new Date(Date.now() + HOUR_MS) });
      const accessToken = accessTokenOf(await login("ana@example.com", TEMPORARY).expect(200));

      await http.get("/api/v1/login-probe/me").auth(accessToken, { type: "bearer" }).expect(200);
    });
  });

  describe("rejects with the same generic 401", () => {
    it.each<[string, UserRow, string, string]>([
      ["the email is unknown", {}, "bob@example.com", PASSWORD],
      ["the email is not an email", {}, "not-an-email", PASSWORD],
      ["the password is wrong", {}, "ana@example.com", "wrong-password"],
      [
        "the temporary password expired",
        { temporaryExpiresAt: new Date(Date.now() - 1_000) },
        "ana@example.com",
        TEMPORARY,
      ],
      ["the user is inactive", { isActive: false }, "ana@example.com", PASSWORD],
      [
        "the user was deleted",
        { isActive: false, deletedAt: new Date() },
        "ana@example.com",
        PASSWORD,
      ],
    ])("when %s", async (_label, row, email, password) => {
      const id = await insertUser(row);

      const response = await login(email, password).expect(401);

      expect(response.body).toMatchObject(INVALID_CREDENTIALS);
      expect(Object.keys(response.body as ErrorResponse).sort()).toEqual([
        "code",
        "message",
        "path",
        "statusCode",
        "timestamp",
      ]);
      expect(refreshCookie(response)).toBeUndefined();
      expect((await readUser(id))?.last_login_at).toBeNull();
      const { rows } = await pool.query("SELECT 1 FROM libreria.sessions");
      expect(rows).toHaveLength(0);
    });
  });

  it("answers the generic 401, not a 500, when the stored hash cannot be read", async () => {
    const id = await insertUser();
    await pool.query("UPDATE libreria.users SET password_hash = 'not-a-hash' WHERE id = $1", [id]);

    const response = await login("ana@example.com", PASSWORD).expect(401);

    expect(response.body).toMatchObject(INVALID_CREDENTIALS);
  });

  describe("validates the body", () => {
    it.each([
      ["without email", { password: PASSWORD }, "email", "Ingresá tu email."],
      ["without password", { email: "ana@example.com" }, "password", "Ingresá tu contraseña."],
      ["with a number as email", { email: 1, password: PASSWORD }, "email", "Ingresá tu email."],
      [
        "with an oversized password",
        { email: "ana@example.com", password: "a".repeat(1025) },
        "password",
        "Es demasiado largo.",
      ],
    ])("answers 400 %s", async (_label, body, field, message) => {
      const response = await http.post("/api/v1/auth/login").send(body).expect(400);

      expect(response.body).toMatchObject({
        code: "VALIDATION_FAILED",
        details: [{ field, messages: expect.arrayContaining([message]) as string[] }],
      });
    });

    it("rejects unknown fields", async () => {
      await http
        .post("/api/v1/auth/login")
        .send({ email: "ana@example.com", password: PASSWORD, role: "ADMIN" })
        .expect(400);
    });
  });
});
