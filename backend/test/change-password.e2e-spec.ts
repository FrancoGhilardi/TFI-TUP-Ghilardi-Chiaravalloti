import { createHash } from "node:crypto";
import { Controller, Get, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import argon2 from "argon2";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { Env } from "./../src/config/env.js";
import { UserRole } from "./../src/modules/identity/domain/user-role.js";
import { Roles } from "./../src/modules/identity/presentation/decorators/roles.decorator.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { createTestApp } from "./create-test-app.js";
import { adminPool, truncateAll } from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

@Controller("change-password-probe")
class ChangePasswordProbeController {
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @Get()
  any() {
    return { ok: true };
  }
}

const PASSWORD = "current-password";
const NEW_PASSWORD = "brand-new-password";

interface UserRow {
  password_hash: string;
  must_change_password: boolean;
  temporary_password_hash: string | null;
  password_changed_at: Date | null;
  last_login_at: Date | null;
}

interface SessionRow {
  refresh_token_hash: string;
  revoked_at: Date | null;
}

const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");

describe("Change password (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let passwordHash: string;
  let userId: string;
  let frontendOrigin: string;

  beforeAll(async () => {
    pool = adminPool();
    passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  });

  // A fresh app per test starts the rate limits at zero.
  beforeEach(async () => {
    await truncateAll(pool);
    app = await createTestApp({ controllers: [ChangePasswordProbeController] });
    http = request(app.getHttpServer());
    frontendOrigin = new URL(app.get(ConfigService<Env, true>).get("FRONTEND_URL", { infer: true }))
      .origin;
    userId = await insertUser();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await pool.end();
  });

  async function insertUser(options: { mustChangePassword?: boolean } = {}): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO libreria.users
         (email, name, password_hash, role, is_active, must_change_password)
       VALUES ('ana@example.com', 'Ana', $1, 'SELLER', true, $2) RETURNING id`,
      [passwordHash, options.mustChangePassword ?? false],
    );
    return rows[0].id;
  }

  async function readUser(): Promise<UserRow> {
    const { rows } = await pool.query<UserRow>(
      `SELECT password_hash, must_change_password, temporary_password_hash, password_changed_at,
              last_login_at
       FROM libreria.users WHERE id = $1`,
      [userId],
    );
    return rows[0];
  }

  async function sessions(): Promise<SessionRow[]> {
    const { rows } = await pool.query<SessionRow>(
      "SELECT refresh_token_hash, revoked_at FROM libreria.sessions WHERE user_id = $1",
      [userId],
    );
    return rows;
  }

  const refreshCookie = (response: request.Response) =>
    (response.get("Set-Cookie") ?? []).find((cookie) =>
      cookie.startsWith("__Secure-refresh_token="),
    );

  const tokenOf = (response: request.Response) =>
    /^__Secure-refresh_token=([^;]*)/.exec(refreshCookie(response) ?? "")?.[1] ?? "";

  const accessTokenOf = (response: request.Response) =>
    (response.body as { accessToken: string }).accessToken;

  const login = (password = PASSWORD) =>
    http.post("/api/v1/auth/login").send({ email: "ana@example.com", password }).expect(200);

  const changePassword = (accessToken: string | undefined, body: Record<string, unknown>) => {
    const pending = http.post("/api/v1/auth/change-password").send(body);
    return accessToken === undefined
      ? pending
      : pending.set("Authorization", `Bearer ${accessToken}`);
  };

  const probe = (accessToken: string) =>
    http.get("/api/v1/change-password-probe").set("Authorization", `Bearer ${accessToken}`);

  // Access tokens carry whole seconds, so one issued earlier in the same second as the change
  // is still accepted until it expires; waiting for the next second leaves that window out.
  const nextSecond = () =>
    new Promise((resolve) => setTimeout(resolve, 1000 - (Date.now() % 1000) + 10));

  describe("with the right current password", () => {
    it("stores the new password and starts a new session for this device", async () => {
      const loggedIn = await login();

      const response = await changePassword(accessTokenOf(loggedIn), {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      })
        .set("User-Agent", "Firefox")
        .expect(200);

      const body = response.body as { accessToken: string; expiresIn: number; user: unknown };
      expect(Object.keys(body).sort()).toEqual(["accessToken", "expiresIn", "user"]);
      expect(body.user).toEqual({
        id: userId,
        email: "ana@example.com",
        name: "Ana",
        role: "SELLER",
        mustChangePassword: false,
      });
      const newToken = tokenOf(response);
      expect(newToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(newToken).not.toBe(tokenOf(loggedIn));
      expect(refreshCookie(response)).toMatch(/; HttpOnly; Secure; SameSite=Strict$/);
      expect(JSON.stringify(body)).not.toContain(newToken);

      const user = await readUser();
      expect(user.password_changed_at).not.toBeNull();
      expect(await argon2.verify(user.password_hash, NEW_PASSWORD)).toBe(true);
      await login(NEW_PASSWORD);
      await http
        .post("/api/v1/auth/login")
        .send({ email: "ana@example.com", password: PASSWORD })
        .expect(401);
    });

    it("drops a temporary password still pending, without recording a login", async () => {
      const loggedIn = await login();
      // Requested with forgot-password after logging in, so it lives alongside the password.
      await pool.query(
        `UPDATE libreria.users SET last_login_at = NULL,
           temporary_password_hash = 'temporary-hash',
           temporary_password_expires_at = now() + interval '1 hour'
         WHERE id = $1`,
        [userId],
      );

      await changePassword(accessTokenOf(loggedIn), {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }).expect(200);

      const user = await readUser();
      expect(user.temporary_password_hash).toBeNull();
      expect(user.last_login_at).toBeNull();
    });
  });

  describe("revokes the other sessions", () => {
    it("ends every earlier session and the access tokens of earlier seconds, keeping only the new one", async () => {
      const otherDevice = await login();
      const thisDevice = await login();
      await nextSecond();

      const response = await changePassword(accessTokenOf(thisDevice), {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }).expect(200);

      const active = (await sessions()).filter((row) => row.revoked_at === null);
      expect(active.map((row) => row.refresh_token_hash)).toEqual([hashOf(tokenOf(response))]);
      await probe(accessTokenOf(response)).expect(200);
      await probe(accessTokenOf(otherDevice)).expect(401);
      await probe(accessTokenOf(thisDevice)).expect(401);
      await http
        .post("/api/v1/auth/refresh")
        .set("Origin", frontendOrigin)
        .set("Cookie", `__Secure-refresh_token=${tokenOf(otherDevice)}`)
        .expect(401);
    });
  });

  describe("with a pending password change", () => {
    it("lets the user change it, and then reach the rest of the API", async () => {
      await pool.query("DELETE FROM libreria.users");
      userId = await insertUser({ mustChangePassword: true });
      const loggedIn = await login();
      await probe(accessTokenOf(loggedIn)).expect(403);

      const response = await changePassword(accessTokenOf(loggedIn), {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }).expect(200);

      expect((response.body as { user: { mustChangePassword: boolean } }).user).toMatchObject({
        mustChangePassword: false,
      });
      expect((await readUser()).must_change_password).toBe(false);
      await probe(accessTokenOf(response)).expect(200);
    });
  });

  describe("rejects without changing the password or the sessions", () => {
    it.each([
      [
        "a wrong current password",
        { currentPassword: "wrong-password", newPassword: NEW_PASSWORD },
        { statusCode: 400, code: "INVALID_CURRENT_PASSWORD" },
      ],
      [
        "a new password equal to the current one",
        { currentPassword: PASSWORD, newPassword: PASSWORD },
        { statusCode: 422, code: "PASSWORD_UNCHANGED" },
      ],
      [
        "a new password that breaks the policy",
        { currentPassword: PASSWORD, newPassword: "short" },
        { statusCode: 400, code: "INVALID_PASSWORD" },
      ],
      [
        "a missing field",
        { currentPassword: PASSWORD },
        { statusCode: 400, code: "VALIDATION_FAILED" },
      ],
    ])("%s", async (_label, body, expected) => {
      const loggedIn = await login();

      const response = await changePassword(accessTokenOf(loggedIn), body).expect(
        expected.statusCode,
      );

      expect(response.body as ErrorResponse).toMatchObject(expected);
      expect(refreshCookie(response)).toBeUndefined();
      const user = await readUser();
      expect(user.password_hash).toBe(passwordHash);
      expect(user.password_changed_at).toBeNull();
      expect((await sessions()).every((row) => row.revoked_at === null)).toBe(true);
    });

    it("a request without an access token", async () => {
      const response = await changePassword(undefined, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }).expect(401);

      expect((response.body as ErrorResponse).code).toBe("INVALID_ACCESS_TOKEN");
      expect((await readUser()).password_hash).toBe(passwordHash);
    });
  });

  it("allows 5 attempts per minute, against guessing the current password", async () => {
    const accessToken = accessTokenOf(await login());
    const attempt = () =>
      changePassword(accessToken, { currentPassword: "wrong", newPassword: NEW_PASSWORD });
    for (let i = 0; i < 5; i++) {
      await attempt().expect(400);
    }

    const response = await attempt().expect(429);

    expect((response.body as ErrorResponse).code).toBe("TOO_MANY_REQUESTS");
  });
});
