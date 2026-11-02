import { type INestApplication, Logger } from "@nestjs/common";
import argon2 from "argon2";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import { MailDeliveryError } from "./../src/modules/identity/application/errors/mail-delivery-error.js";
import { AccessTokenService } from "./../src/modules/identity/application/ports/access-token-service.js";
import { PasswordResetNotifier } from "./../src/modules/identity/application/ports/password-reset-notifier.js";
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

/** Keeps the mails instead of sending them; can be told to fail like the provider. */
class RecordingNotifier extends PasswordResetNotifier {
  readonly sent: { to: string; name: string; temporaryPassword: string }[] = [];
  failure: MailDeliveryError | undefined;

  sendAssignedPassword(to: string, name: string, temporaryPassword: string): Promise<void> {
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    this.sent.push({ to, name, temporaryPassword });
    return Promise.resolve();
  }

  sendTemporaryPassword(): Promise<void> {
    return Promise.reject(new Error("Not used by the admin reset"));
  }
}

interface UserRow {
  password_hash: string;
  must_change_password: boolean;
  temporary_password_hash: string | null;
  updated_by: string | null;
}

describe("Admin reset password (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let notifier: RecordingNotifier;
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
    notifier = new RecordingNotifier();
    app = await createTestApp({
      overrides: [{ provide: PasswordResetNotifier, useValue: notifier }],
    });
    http = request(app.getHttpServer());
    adminId = await insertUser("admin@example.com", { role: "ADMIN" });
    adminToken = await tokenFor(adminId);
    userId = await insertUser("ana@example.com");
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await pool.end();
  });

  async function insertUser(
    email: string,
    options: { role?: "ADMIN" | "SELLER"; isActive?: boolean; deleted?: boolean } = {},
  ): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO libreria.users
         (email, name, password_hash, role, is_active, must_change_password, deleted_at)
       VALUES ($1, 'Ana', $2, $3, $4, false, $5) RETURNING id`,
      [
        email,
        passwordHash,
        options.role ?? "SELLER",
        options.deleted ? false : (options.isActive ?? true),
        options.deleted ? new Date() : null,
      ],
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
      `SELECT password_hash, must_change_password, temporary_password_hash, updated_by
       FROM libreria.users WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  async function insertSession(id = userId): Promise<void> {
    await pool.query(
      `INSERT INTO libreria.sessions (user_id, refresh_token_hash, family_id, expires_at)
       VALUES ($1, gen_random_uuid()::text, gen_random_uuid(), now() + interval '1 day')`,
      [id],
    );
  }

  async function openSessions(id = userId): Promise<number> {
    const { rows } = await pool.query<{ open: string }>(
      "SELECT count(*) AS open FROM libreria.sessions WHERE user_id = $1 AND revoked_at IS NULL",
      [id],
    );
    return Number(rows[0]?.open);
  }

  const reset = (id = userId, token = adminToken) =>
    http.post(`/api/v1/admin/users/${id}/reset-password`).set("Authorization", `Bearer ${token}`);

  const login = (password: string) =>
    http.post("/api/v1/auth/login").send({ email: "ana@example.com", password });

  const expectError = async (pending: request.Test, statusCode: number, code: string) => {
    const response = await pending.expect(statusCode);
    expect((response.body as ErrorResponse).code).toBe(code);
  };

  describe("for another user", () => {
    it("replaces the password with a mailed temporary one that must be changed", async () => {
      const response = await reset().expect(204);

      expect(response.text).toBe("");
      const [mail] = notifier.sent;
      expect(mail).toMatchObject({ to: "ana@example.com", name: "Ana" });
      expect(mail?.temporaryPassword).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);
      const user = await readUser();
      expect(user.must_change_password).toBe(true);
      expect(user.updated_by).toBe(adminId);

      await login(PASSWORD).expect(401);
      const loggedIn = await login(mail?.temporaryPassword ?? "").expect(200);
      expect(loggedIn.body).toMatchObject({ user: { mustChangePassword: true } });
    });

    it("drops a temporary password pending from the forgot flow", async () => {
      await pool.query(
        `UPDATE libreria.users SET temporary_password_hash = 'forgot-hash',
           temporary_password_expires_at = now() + interval '30 minutes' WHERE id = $1`,
        [userId],
      );

      await reset().expect(204);

      expect((await readUser()).temporary_password_hash).toBeNull();
    });

    it("ends the sessions of the user", async () => {
      await insertSession();

      await reset().expect(204);

      expect(await openSessions()).toBe(0);
    });

    it("ignores a body sent along", async () => {
      await reset().send({ temporaryPassword: "chosen-by-admin" }).expect(204);

      expect(notifier.sent[0]?.temporaryPassword).not.toBe("chosen-by-admin");
    });

    it("also resets an inactive user", async () => {
      const inactive = await insertUser("inactive@example.com", { isActive: false });

      await reset(inactive).expect(204);

      expect((await readUser(inactive)).must_change_password).toBe(true);
    });
  });

  describe("refuses without changing anything", () => {
    it("on the admin's own account", async () => {
      await expectError(reset(adminId), 422, "SELF_ADMINISTRATION");

      expect((await readUser(adminId)).password_hash).toBe(passwordHash);
      expect(notifier.sent).toEqual([]);
    });

    it("for a deleted user", async () => {
      const deleted = await insertUser("deleted@example.com", { deleted: true });

      await expectError(reset(deleted), 422, "USER_DELETED");
    });

    it.each([UNKNOWN_ID, "not-a-uuid"])("for %s", async (id) => {
      await expectError(reset(id), 404, "USER_NOT_FOUND");
    });

    it("for a seller", async () => {
      const seller = await tokenFor(await insertUser("seller@example.com"));

      await expectError(reset(userId, seller), 403, "INSUFFICIENT_ROLE");
    });

    it.each([
      ["rejected by the provider", false],
      ["with an unknown outcome", true],
    ])("when the mail fails, %s, answering 502", async (_label, maybeDelivered) => {
      vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
      await insertSession();
      notifier.failure = new MailDeliveryError(new Error("provider"), maybeDelivered);

      await expectError(reset(), 502, "MAIL_DELIVERY_FAILED");

      const user = await readUser();
      expect(user.password_hash).toBe(passwordHash);
      expect(user.must_change_password).toBe(false);
      expect(await openSessions()).toBe(1);
      await login(PASSWORD).expect(200);
    });
  });

  it("allows 10 resets every 15 minutes", async () => {
    for (let i = 0; i < 10; i++) {
      await reset().expect(204);
    }

    await expectError(reset(), 429, "TOO_MANY_REQUESTS");
  });
});
