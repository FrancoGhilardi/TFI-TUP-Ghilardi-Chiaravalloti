import { createHash } from "node:crypto";
import { type INestApplication, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import argon2 from "argon2";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { MockInstance } from "vitest";
import type { Env } from "./../src/config/env.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { createTestApp } from "./create-test-app.js";
import { adminPool, truncateAll } from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const ORIGIN_NOT_ALLOWED = {
  statusCode: 403,
  code: "ORIGIN_NOT_ALLOWED",
  message: "No se pudo verificar el origen de la solicitud.",
};
const CLEARED_COOKIE =
  /^__Secure-refresh_token=; Path=\/api\/v1\/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict$/;
const PASSWORD = "current-password";
const DAY_MS = 86_400_000;

interface SessionRow {
  refresh_token_hash: string;
  revoked_at: Date | null;
  rotated_at: Date | null;
}

const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");

describe("Logout (e2e)", () => {
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
    app = await createTestApp();
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
    // A logout is never taken as a reuse of the token.
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await app.close();
    await pool.end();
  });

  async function insertSession(
    token: string,
    options: { expiresAt?: Date; createdAt?: Date } = {},
  ): Promise<void> {
    await pool.query(
      `INSERT INTO libreria.sessions (user_id, refresh_token_hash, family_id, expires_at, created_at)
       VALUES ($1, $2, gen_random_uuid(), $3, $4)`,
      [
        userId,
        hashOf(token),
        options.expiresAt ?? new Date(Date.now() + 7 * DAY_MS),
        options.createdAt ?? new Date(),
      ],
    );
  }

  async function sessionOf(token: string): Promise<SessionRow | undefined> {
    const { rows } = await pool.query<SessionRow>(
      `SELECT refresh_token_hash, revoked_at, rotated_at
       FROM libreria.sessions WHERE refresh_token_hash = $1`,
      [hashOf(token)],
    );
    return rows[0];
  }

  const post = (path: string, token?: string) => {
    const pending = http.post(path).set("Origin", frontendOrigin);
    return token === undefined ? pending : pending.set("Cookie", `__Secure-refresh_token=${token}`);
  };
  const logout = (token?: string) => post("/api/v1/auth/logout", token);

  const refreshCookie = (response: request.Response) =>
    (response.get("Set-Cookie") ?? []).find((cookie) =>
      cookie.startsWith("__Secure-refresh_token="),
    );

  const tokenOf = (response: request.Response) =>
    /^__Secure-refresh_token=([^;]*)/.exec(refreshCookie(response) ?? "")?.[1] ?? "";

  const expectLoggedOut = async (pending: request.Test) => {
    const response = await pending.expect(204);
    expect(response.text).toBe("");
    expect(refreshCookie(response)).toMatch(CLEARED_COOKIE);
    return response;
  };

  describe("with an active session", () => {
    it("revokes the session from a real login and clears the cookie", async () => {
      const loggedIn = await http
        .post("/api/v1/auth/login")
        .send({ email: "ana@example.com", password: PASSWORD })
        .expect(200);
      const token = tokenOf(loggedIn);

      await expectLoggedOut(logout(token));

      const row = await sessionOf(token);
      expect(row?.revoked_at).not.toBeNull();
      expect(row?.rotated_at).toBeNull();
    });

    it("needs no access token, so a stale one sent along does not stop it", async () => {
      await insertSession("old-token");

      await expectLoggedOut(logout("old-token").set("Authorization", "Bearer expired-or-forged"));

      expect((await sessionOf("old-token"))?.revoked_at).not.toBeNull();
    });

    it("leaves the sessions of the user's other logins alone", async () => {
      await insertSession("old-token");
      await insertSession("other-device");

      await expectLoggedOut(logout("old-token"));

      expect((await sessionOf("other-device"))?.revoked_at).toBeNull();
    });

    it("makes a later refresh with that token fail, without taking it as a reuse", async () => {
      await insertSession("old-token");
      await insertSession("other-device");
      await expectLoggedOut(logout("old-token"));

      const response = await post("/api/v1/auth/refresh", "old-token").expect(401);

      expect((response.body as ErrorResponse).code).toBe("INVALID_SESSION");

      expect((await sessionOf("other-device"))?.revoked_at).toBeNull();
    });

    it("revokes an expired session that was never revoked", async () => {
      await insertSession("old-token", {
        createdAt: new Date(Date.now() - 8 * DAY_MS),
        expiresAt: new Date(Date.now() - DAY_MS),
      });

      await expectLoggedOut(logout("old-token"));

      expect((await sessionOf("old-token"))?.revoked_at).not.toBeNull();
    });
  });

  describe("is idempotent", () => {
    it("answers the same to a second logout and keeps when the session ended", async () => {
      await insertSession("old-token");
      await expectLoggedOut(logout("old-token"));
      const revokedAt = (await sessionOf("old-token"))?.revoked_at;

      await expectLoggedOut(logout("old-token"));

      expect((await sessionOf("old-token"))?.revoked_at).toEqual(revokedAt);
    });

    it.each([
      ["without the cookie", undefined],
      ["with an unknown token", "unknown-token"],
    ])("clears the cookie %s and revokes nothing", async (_label, token) => {
      await insertSession("other-device");

      await expectLoggedOut(logout(token));

      expect((await sessionOf("other-device"))?.revoked_at).toBeNull();
    });
  });

  describe("ends the whole family of the token", () => {
    it("revokes the session that replaced a token already spent by a refresh", async () => {
      await insertSession("old-token");
      await insertSession("other-device");
      const renewed = tokenOf(await post("/api/v1/auth/refresh", "old-token").expect(200));

      await expectLoggedOut(logout("old-token"));

      expect((await sessionOf(renewed))?.revoked_at).not.toBeNull();
      expect((await sessionOf("other-device"))?.revoked_at).toBeNull();
    });

    it("waits for a refresh in progress and ends the session it starts", async () => {
      await insertSession("old-token");
      const refreshInProgress = await pool.connect();
      try {
        // Does what a refresh does while it holds the lock on the user: rotates the session
        // and starts a new one in its family, committed only after the logout arrived.
        await refreshInProgress.query("BEGIN");
        await refreshInProgress.query("SELECT id FROM libreria.users WHERE id = $1 FOR UPDATE", [
          userId,
        ]);
        await refreshInProgress.query(
          `UPDATE libreria.sessions SET revoked_at = now(), rotated_at = now()
           WHERE refresh_token_hash = $1`,
          [hashOf("old-token")],
        );
        await refreshInProgress.query(
          `INSERT INTO libreria.sessions (user_id, refresh_token_hash, family_id, expires_at)
           SELECT user_id, $2, family_id, expires_at FROM libreria.sessions
           WHERE refresh_token_hash = $1`,
          [hashOf("old-token"), hashOf("new-token")],
        );

        const loggedOut = expectLoggedOut(logout("old-token"));
        await new Promise((resolve) => setTimeout(resolve, 300));
        await refreshInProgress.query("COMMIT");
        await loggedOut;
      } finally {
        refreshInProgress.release();
      }

      expect((await sessionOf("new-token"))?.revoked_at).not.toBeNull();
    });

    it("leaves no session of the family alive when a refresh races the logout", async () => {
      await insertSession("old-token");
      await insertSession("other-device");

      const [renewal] = await Promise.all([
        post("/api/v1/auth/refresh", "old-token"),
        expectLoggedOut(logout("old-token")),
      ]);

      // Whichever runs first, the session the refresh may have started is revoked too.
      expect([200, 401]).toContain(renewal.status);
      const { rows } = await pool.query<{ refresh_token_hash: string }>(
        `SELECT refresh_token_hash FROM libreria.sessions
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId],
      );
      expect(rows).toEqual([{ refresh_token_hash: hashOf("other-device") }]);
    });
  });

  describe("checks the origin before reading the cookie", () => {
    it.each([
      ["without Origin or Referer", undefined],
      ["from a foreign origin", "https://evil.example.org"],
    ])("rejects a request %s and leaves the session alone", async (_label, origin) => {
      await insertSession("old-token");
      const pending = http
        .post("/api/v1/auth/logout")
        .set("Cookie", "__Secure-refresh_token=old-token");

      const response = await (
        origin === undefined ? pending : pending.set("Origin", origin)
      ).expect(403);

      expect(response.body as ErrorResponse).toMatchObject(ORIGIN_NOT_ALLOWED);
      expect(refreshCookie(response)).toBeUndefined();
      expect((await sessionOf("old-token"))?.revoked_at).toBeNull();
    });
  });
});
