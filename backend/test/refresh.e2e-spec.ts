import { createHash } from "node:crypto";
import { Controller, Get, type INestApplication, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import argon2 from "argon2";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { MockInstance } from "vitest";
import type { Env } from "./../src/config/env.js";
import { UserRole } from "./../src/modules/identity/domain/user-role.js";
import type { AuthUser } from "./../src/modules/identity/presentation/auth-user.js";
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

@Controller("refresh-probe")
class RefreshProbeController {
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}

const INVALID_SESSION = {
  statusCode: 401,
  code: "INVALID_SESSION",
  message: "Tu sesión terminó. Iniciá sesión de nuevo.",
  path: "/api/v1/auth/refresh",
};
const ORIGIN_NOT_ALLOWED = {
  statusCode: 403,
  code: "ORIGIN_NOT_ALLOWED",
  message: "No se pudo verificar el origen de la solicitud.",
};
const PASSWORD = "current-password";
const DAY_MS = 86_400_000;

interface SessionRow {
  id: string;
  family_id: string;
  refresh_token_hash: string;
  revoked_at: Date | null;
  rotated_at: Date | null;
  expires_at: Date;
  user_agent: string | null;
}

const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");

describe("Refresh (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let frontendOrigin: string;
  let passwordHash: string;
  let userId: string;
  let warn: MockInstance<Logger["warn"]>;

  beforeAll(async () => {
    pool = adminPool();
    passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
    app = await createTestApp({ controllers: [RefreshProbeController] });
    http = request(app.getHttpServer());
    frontendOrigin = new URL(app.get(ConfigService<Env, true>).get("FRONTEND_URL", { infer: true }))
      .origin;
  });

  beforeEach(async () => {
    warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    await truncateAll(pool);
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO libreria.users (email, name, password_hash, role, is_active, must_change_password)
       VALUES ('ana@example.com', 'Ana', $1, 'SELLER', true, false) RETURNING id`,
      [passwordHash],
    );
    userId = rows[0].id;
  });

  afterEach(() => {
    warn.mockRestore();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await app.close();
    await pool.end();
  });

  async function insertSession(
    token: string,
    options: { expiresAt?: Date; createdAt?: Date; revokedAt?: Date } = {},
  ): Promise<void> {
    await pool.query(
      `INSERT INTO libreria.sessions
         (user_id, refresh_token_hash, family_id, expires_at, created_at, revoked_at)
       VALUES ($1, $2, gen_random_uuid(), $3, $4, $5)`,
      [
        userId,
        hashOf(token),
        options.expiresAt ?? new Date(Date.now() + 7 * DAY_MS),
        options.createdAt ?? new Date(),
        options.revokedAt ?? null,
      ],
    );
  }

  async function sessions(): Promise<SessionRow[]> {
    const { rows } = await pool.query<SessionRow>(
      `SELECT id, family_id, refresh_token_hash, revoked_at, rotated_at, expires_at, user_agent
       FROM libreria.sessions WHERE user_id = $1 ORDER BY created_at`,
      [userId],
    );
    return rows;
  }

  const refresh = (token?: string) => {
    const pending = http.post("/api/v1/auth/refresh").set("Origin", frontendOrigin);
    return token === undefined ? pending : pending.set("Cookie", `__Secure-refresh_token=${token}`);
  };

  const refreshCookie = (response: request.Response) =>
    (response.get("Set-Cookie") ?? []).find((cookie) =>
      cookie.startsWith("__Secure-refresh_token="),
    );

  const tokenOf = (response: request.Response) =>
    /^__Secure-refresh_token=([^;]*)/.exec(refreshCookie(response) ?? "")?.[1];

  const expectRejected = async (pending: request.Test) => {
    const response = await pending.expect(401);
    expect(response.body as ErrorResponse).toMatchObject(INVALID_SESSION);
    // The dead token is dropped, so the browser stops sending it.
    expect(refreshCookie(response)).toMatch(
      /^__Secure-refresh_token=; Path=\/api\/v1\/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict$/,
    );
    return response;
  };

  describe("with a valid token", () => {
    it("rotates the token from a real login and returns a new access token", async () => {
      const loggedIn = await http
        .post("/api/v1/auth/login")
        .send({ email: "ana@example.com", password: PASSWORD })
        .expect(200);
      const firstToken = tokenOf(loggedIn);

      const response = await refresh(firstToken).set("User-Agent", "Firefox").expect(200);

      expect(response.get("Cache-Control")).toBe("no-store");
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
      expect(newToken).not.toBe(firstToken);
      expect(JSON.stringify(body)).not.toContain(newToken);

      const [old, current] = await sessions();
      expect(old.refresh_token_hash).toBe(hashOf(firstToken ?? ""));
      expect(old.revoked_at).not.toBeNull();
      expect(old.rotated_at).toEqual(old.revoked_at);
      expect(current.refresh_token_hash).toBe(hashOf(newToken ?? ""));
      expect(current.revoked_at).toBeNull();
      expect(current.user_agent).toBe("Firefox");
      // The login starts the family and the refresh keeps it.
      expect(old.family_id).toBe(old.id);
      expect(current.family_id).toBe(old.id);
    });

    it("writes the new token in the same secure cookie the login uses", async () => {
      await insertSession("old-token");

      const response = await refresh("old-token").expect(200);

      const [, current] = await sessions();
      expect(refreshCookie(response)).toBe(
        `__Secure-refresh_token=${tokenOf(response)}; Path=/api/v1/auth; ` +
          `Expires=${current.expires_at.toUTCString()}; HttpOnly; Secure; SameSite=Strict`,
      );
    });

    it("gives an access token that works on protected routes", async () => {
      await insertSession("old-token");

      const response = await refresh("old-token").expect(200);

      const { accessToken } = response.body as { accessToken: string };
      await http
        .get("/api/v1/refresh-probe/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
    });

    it("can be chained: each new token renews the session once more", async () => {
      await insertSession("old-token");

      const second = tokenOf(await refresh("old-token").expect(200));
      await refresh(second).expect(200);

      const rows = await sessions();
      expect(rows.map((row) => row.revoked_at === null)).toEqual([false, false, true]);
    });
  });

  describe("with a token used twice", () => {
    it("rejects it and revokes every session of the user, the new one included", async () => {
      await insertSession("old-token");
      await insertSession("other-device");
      await refresh("old-token").expect(200);

      await expectRejected(refresh("old-token"));

      expect((await sessions()).every((row) => row.revoked_at !== null)).toBe(true);
      expect(warn).toHaveBeenCalledExactlyOnceWith(
        `Refresh token reused; all sessions revoked for user ${userId}`,
      );
    });

    it("lets only one of two simultaneous refreshes through, then revokes everything", async () => {
      await insertSession("old-token");

      const responses = await Promise.all([refresh("old-token"), refresh("old-token")]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
      expect((await sessions()).every((row) => row.revoked_at !== null)).toBe(true);
      expect(warn).toHaveBeenCalledOnce();
    });
  });

  describe("with a token revoked without a refresh, which is not a reuse", () => {
    afterEach(() => {
      expect(warn).not.toHaveBeenCalled();
    });

    it("rejects it after a password change, keeping the session started afterwards", async () => {
      await insertSession("old-token");
      // The trigger revokes every session; then the user logs in again elsewhere.
      await pool.query("UPDATE libreria.users SET password_hash = 'new-hash' WHERE id = $1", [
        userId,
      ]);
      await insertSession("new-device");

      await expectRejected(refresh("old-token"));

      const rows = await sessions();
      const newDevice = rows.find((row) => row.refresh_token_hash === hashOf("new-device"));
      expect(newDevice?.revoked_at).toBeNull();
    });

    it("rejects the session of a user who was deactivated", async () => {
      await insertSession("old-token");
      await pool.query("UPDATE libreria.users SET is_active = false WHERE id = $1", [userId]);

      await expectRejected(refresh("old-token"));

      expect((await sessions())[0].rotated_at).toBeNull();
    });

    it("rejects a session revoked on its own, like by a logout", async () => {
      await insertSession("old-token", { revokedAt: new Date() });
      await insertSession("other-device");

      await expectRejected(refresh("old-token"));

      const rows = await sessions();
      expect(
        rows.find((row) => row.refresh_token_hash === hashOf("other-device"))?.revoked_at,
      ).toBeNull();
    });
  });

  describe("rejects without revoking the other sessions", () => {
    beforeEach(async () => {
      await insertSession("other-device");
    });

    const otherDeviceStillActive = async () => {
      const rows = await sessions();
      const other = rows.find((row) => row.refresh_token_hash === hashOf("other-device"));
      expect(other?.revoked_at).toBeNull();
    };

    it("a request without the cookie", async () => {
      await expectRejected(refresh());
      await otherDeviceStillActive();
    });

    it("an unknown token", async () => {
      await expectRejected(refresh("unknown-token"));
      await otherDeviceStillActive();
    });

    it("an expired session", async () => {
      await insertSession("old-token", {
        createdAt: new Date(Date.now() - 8 * DAY_MS),
        expiresAt: new Date(Date.now() - DAY_MS),
      });

      await expectRejected(refresh("old-token"));
      await otherDeviceStillActive();
    });
  });

  describe("checks the origin before reading the cookie", () => {
    it.each([
      ["without Origin or Referer", undefined],
      ["from a foreign origin", "https://evil.example.org"],
    ])("rejects a request %s and leaves the session alone", async (_label, origin) => {
      await insertSession("old-token");
      const pending = http
        .post("/api/v1/auth/refresh")
        .set("Cookie", "__Secure-refresh_token=old-token");

      const response = await (
        origin === undefined ? pending : pending.set("Origin", origin)
      ).expect(403);

      expect(response.body as ErrorResponse).toMatchObject(ORIGIN_NOT_ALLOWED);
      expect(refreshCookie(response)).toBeUndefined();
      expect((await sessions())[0].revoked_at).toBeNull();
    });
  });
});
