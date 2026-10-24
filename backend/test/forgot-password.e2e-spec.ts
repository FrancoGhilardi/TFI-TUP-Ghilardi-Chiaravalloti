import { Controller, Get, type INestApplication, Logger } from "@nestjs/common";
import argon2 from "argon2";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import { PasswordResetNotifier } from "./../src/modules/identity/application/ports/password-reset-notifier.js";
import { UserRole } from "./../src/modules/identity/domain/user-role.js";
import { Roles } from "./../src/modules/identity/presentation/decorators/roles.decorator.js";
import { BackgroundTasks } from "./../src/shared/application/background-tasks.js";
import type { LoggingBackgroundTasks } from "./../src/shared/infrastructure/logging-background-tasks.js";
import { createTestApp } from "./create-test-app.js";
import { adminPool, truncateAll } from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

@Controller("forgot-password-probe")
class ForgotPasswordProbeController {
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @Get()
  any() {
    return { ok: true };
  }
}

const PASSWORD = "current-password";

interface SentMail {
  to: string;
  name: string;
  temporaryPassword: string;
  expiresAt: Date;
}

/** Keeps the mails instead of sending them; can be told to fail like a provider outage. */
class RecordingNotifier extends PasswordResetNotifier {
  readonly sent: SentMail[] = [];
  failing = false;

  sendTemporaryPassword(
    to: string,
    name: string,
    temporaryPassword: string,
    expiresAt: Date,
  ): Promise<void> {
    if (this.failing) {
      return Promise.reject(new Error("mail provider down"));
    }
    this.sent.push({ to, name, temporaryPassword, expiresAt });
    return Promise.resolve();
  }

  sendAssignedPassword(): Promise<void> {
    return Promise.reject(new Error("Not used by forgot-password"));
  }
}

interface UserRow {
  password_hash: string;
  must_change_password: boolean;
  temporary_password_hash: string | null;
  temporary_password_expires_at: Date | null;
}

describe("Forgot password (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let notifier: RecordingNotifier;
  let passwordHash: string;
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
      controllers: [ForgotPasswordProbeController],
      overrides: [{ provide: PasswordResetNotifier, useValue: notifier }],
    });
    http = request(app.getHttpServer());
    userId = await insertUser();
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
    options: { email?: string; isActive?: boolean; deleted?: boolean } = {},
  ): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO libreria.users
         (email, name, password_hash, role, is_active, must_change_password, deleted_at)
       VALUES ($1, 'Ana', $2, 'SELLER', $3, false, $4) RETURNING id`,
      [
        options.email ?? "ana@example.com",
        passwordHash,
        options.isActive ?? !options.deleted,
        options.deleted ? new Date() : null,
      ],
    );
    return rows[0].id;
  }

  async function readUser(id = userId): Promise<UserRow> {
    const { rows } = await pool.query<UserRow>(
      `SELECT password_hash, must_change_password, temporary_password_hash,
              temporary_password_expires_at
       FROM libreria.users WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  const forgotPassword = (email: string) =>
    http.post("/api/v1/auth/forgot-password").send({ email });

  // The request is processed after the response; this waits for it to finish.
  const processed = () => app.get<BackgroundTasks, LoggingBackgroundTasks>(BackgroundTasks).idle();

  const login = (password: string) =>
    http.post("/api/v1/auth/login").send({ email: "ana@example.com", password });

  async function temporaryPassword(): Promise<string> {
    await forgotPassword("ana@example.com").expect(204);
    await processed();
    const [mail] = notifier.sent;
    if (!mail) throw new Error("No mail was sent");
    return mail.temporaryPassword;
  }

  describe("answers the same whether the email exists or not", () => {
    it.each([
      ["an existing account", "ana@example.com"],
      ["an unknown email", "nobody@example.com"],
      ["a malformed email", "not-an-email"],
      ["an inactive account", "inactive@example.com"],
      ["a deleted account", "deleted@example.com"],
    ])("for %s", async (_label, email) => {
      await insertUser({ email: "inactive@example.com", isActive: false });
      await insertUser({ email: "deleted@example.com", deleted: true });

      const response = await forgotPassword(email).expect(204);
      await processed();

      expect(response.text).toBe("");
      expect(response.get("Set-Cookie")).toBeUndefined();
      expect(notifier.sent.map((mail) => mail.to)).toEqual(
        email === "ana@example.com" ? ["ana@example.com"] : [],
      );
    });
  });

  describe("for an existing account", () => {
    it("mails a temporary password that lasts 30 minutes, keeping the current one", async () => {
      const before = Date.now();

      const temporary = await temporaryPassword();

      const [mail] = notifier.sent;
      expect(mail).toMatchObject({ to: "ana@example.com", name: "Ana" });
      expect(temporary).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);
      const user = await readUser();
      expect(user.password_hash).toBe(passwordHash);
      expect(user.must_change_password).toBe(false);
      expect(await argon2.verify(user.temporary_password_hash ?? "", temporary)).toBe(true);
      const lifetime = (user.temporary_password_expires_at?.getTime() ?? 0) - before;
      expect(lifetime).toBeGreaterThan(29 * 60_000);
      expect(lifetime).toBeLessThanOrEqual(30 * 60_000 + 5_000);
      expect(mail?.expiresAt).toEqual(user.temporary_password_expires_at);
    });

    it("lets the current password keep working, which drops the temporary one", async () => {
      await temporaryPassword();

      await login(PASSWORD).expect(200);

      expect((await readUser()).temporary_password_hash).toBeNull();
    });

    it("leaves the open sessions alone", async () => {
      const loggedIn = await login(PASSWORD).expect(200);
      const { accessToken } = loggedIn.body as { accessToken: string };

      await temporaryPassword();

      await http
        .get("/api/v1/forgot-password-probe")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      const { rows } = await pool.query<{ revoked_at: Date | null }>(
        "SELECT revoked_at FROM libreria.sessions",
      );
      expect(rows).toEqual([{ revoked_at: null }]);
    });

    it("sends no second mail while the wait after the last request lasts", async () => {
      await temporaryPassword();

      await forgotPassword("ana@example.com").expect(204);
      await processed();

      expect(notifier.sent).toHaveLength(1);
    });

    it("sends a single mail for two requests at once", async () => {
      await Promise.all([
        forgotPassword("ana@example.com").expect(204),
        forgotPassword("ana@example.com").expect(204),
      ]);
      await processed();

      expect(notifier.sent).toHaveLength(1);
    });

    it("keeps no temporary password when the mail cannot be sent, and logs it", async () => {
      const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
      notifier.failing = true;

      await forgotPassword("ana@example.com").expect(204);
      await processed();

      expect((await readUser()).temporary_password_hash).toBeNull();
      expect(error).toHaveBeenCalledWith("Password reset request failed", expect.any(String));
      notifier.failing = false;
      await temporaryPassword();
    });
  });

  describe("when the temporary password is used", () => {
    it("becomes the password and forces a change before anything else", async () => {
      const temporary = await temporaryPassword();

      const response = await login(temporary).expect(200);

      const body = response.body as { accessToken: string; user: { mustChangePassword: boolean } };
      expect(body.user.mustChangePassword).toBe(true);
      const user = await readUser();
      expect(user.must_change_password).toBe(true);
      expect(user.temporary_password_hash).toBeNull();
      expect(await argon2.verify(user.password_hash, temporary)).toBe(true);
      await login(PASSWORD).expect(401);
      await http
        .get("/api/v1/forgot-password-probe")
        .set("Authorization", `Bearer ${body.accessToken}`)
        .expect(403);
    });

    it("no longer works once it expired", async () => {
      const temporary = await temporaryPassword();
      await pool.query(
        "UPDATE libreria.users SET temporary_password_expires_at = now() - interval '1 second'",
      );

      await login(temporary).expect(401);

      await login(PASSWORD).expect(200);
    });
  });
});
