import type { ConfigService } from "@nestjs/config";
import type { Pool } from "pg";
import type { Env } from "../../src/config/env.js";
import { User } from "../../src/modules/identity/domain/entities/user.js";
import { UserRole } from "../../src/modules/identity/domain/user-role.js";
import { Email } from "../../src/modules/identity/domain/value-objects/email.js";
import { TemporaryPassword } from "../../src/modules/identity/domain/value-objects/temporary-password.js";
import { UserName } from "../../src/modules/identity/domain/value-objects/user-name.js";
import { DrizzleUserRepository } from "../../src/modules/identity/infrastructure/persistence/drizzle-user.repository.js";
import { DrizzleClient } from "../../src/shared/infrastructure/database/drizzle.client.js";
import { DrizzleExecutor } from "../../src/shared/infrastructure/database/drizzle.executor.js";
import { DrizzleTransactionManager } from "../../src/shared/infrastructure/database/drizzle-transaction-manager.js";
import { adminPool, insertUser, truncateAll } from "./db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

describe("DrizzleUserRepository (e2e)", () => {
  let pool: Pool;
  let client: DrizzleClient;
  let repository: DrizzleUserRepository;
  let transactions: DrizzleTransactionManager;

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
    const executor = new DrizzleExecutor(client);
    repository = new DrizzleUserRepository(executor);
    transactions = new DrizzleTransactionManager(client, executor);
  });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await client.onApplicationShutdown();
    await pool.end();
  });

  it("rebuilds every field of an existing user", async () => {
    const id = await insertUser(pool, { email: "Ana@Example.com", role: "ADMIN" });

    const user = await repository.findById(id);

    expect(user?.getId()).toBe(id);
    expect(user?.email.toString()).toBe("ana@example.com");
    expect(user?.name.toString()).toBe("Test user");
    expect(user).toMatchObject({
      passwordHash: "hash",
      role: UserRole.ADMIN,
      active: true,
      mustChangePassword: true,
      temporaryPassword: undefined,
      passwordChangedAt: undefined,
      lastLoginAt: undefined,
      createdBy: undefined,
      deletedAt: undefined,
    });
    expect(user?.createdAt).toBeInstanceOf(Date);
    expect(user?.updatedAt).toBeInstanceOf(Date);
  });

  it("returns null for an id that does not exist", async () => {
    await expect(repository.findById("00000000-0000-4000-8000-000000000000")).resolves.toBeNull();
  });

  it("returns a deleted user, leaving the decision to the caller", async () => {
    const adminId = await insertUser(pool, { role: "ADMIN" });
    const id = await insertUser(pool);
    await pool.query(
      "UPDATE libreria.users SET deleted_at = now(), deleted_by = $1, is_active = false WHERE id = $2",
      [adminId, id],
    );

    const user = await repository.findById(id);

    expect(user?.isDeleted()).toBe(true);
    expect(user?.deletedBy).toBe(adminId);
    expect(user?.canLogin()).toBe(false);
  });

  it("rebuilds the temporary password and the password change date", async () => {
    const id = await insertUser(pool);
    const expiresAt = new Date("2030-01-01T00:00:00.000Z");
    await pool.query(
      `UPDATE libreria.users
       SET temporary_password_hash = 'temp-hash', temporary_password_expires_at = $1,
           password_hash = 'new-hash'
       WHERE id = $2`,
      [expiresAt, id],
    );

    const user = await repository.findById(id);

    expect(user?.temporaryPassword).toEqual({ hash: "temp-hash", expiresAt });
    expect(user?.passwordChangedAt).toBeInstanceOf(Date);
  });

  describe("save", () => {
    const NOW = new Date("2026-10-20T12:00:00.000Z");

    const newUser = (overrides: { id?: string; email?: string; createdBy?: string } = {}) =>
      User.create({
        id: overrides.id ?? "4f9c1f43-6f4b-4d5c-9a3e-5b2d8c7a1e10",
        email: Email.create(overrides.email ?? "nuevo@example.com"),
        name: UserName.create("Nuevo"),
        passwordHash: "temp-hash",
        role: UserRole.SELLER,
        createdBy: overrides.createdBy,
        now: NOW,
      });

    it("stores a new user that reads back the same", async () => {
      const creator = await insertUser(pool, { role: "ADMIN" });
      const user = newUser({ createdBy: creator });

      await repository.save(user);
      const stored = await repository.findById(user.getId());

      expect(stored?.email.toString()).toBe("nuevo@example.com");
      expect(stored?.name.toString()).toBe("Nuevo");
      expect(stored).toMatchObject({
        passwordHash: "temp-hash",
        role: UserRole.SELLER,
        active: true,
        mustChangePassword: true,
        createdBy: creator,
        updatedBy: creator,
        createdAt: NOW,
        updatedAt: NOW,
      });
    });

    it("stores the changes of an existing user without touching who created it", async () => {
      const creator = await insertUser(pool, { role: "ADMIN" });
      const editor = await insertUser(pool, { role: "ADMIN" });
      const user = newUser({ createdBy: creator });
      await repository.save(user);

      user.rename(UserName.create("Renombrado"), editor, new Date("2026-10-21T00:00:00.000Z"));
      user.changeRole(UserRole.ADMIN, editor, new Date("2026-10-21T00:00:00.000Z"));
      user.issueTemporaryPassword(
        new TemporaryPassword("forgot-hash", new Date("2030-01-01T00:00:00.000Z")),
        new Date("2026-10-21T00:00:00.000Z"),
      );
      await repository.save(user);
      const stored = await repository.findById(user.getId());

      expect(stored?.name.toString()).toBe("Renombrado");
      expect(stored).toMatchObject({
        role: UserRole.ADMIN,
        createdBy: creator,
        createdAt: NOW,
        // The last change was the forgot-password request, made by the user.
        updatedBy: user.getId(),
        temporaryPassword: { hash: "forgot-hash", expiresAt: new Date("2030-01-01T00:00:00.000Z") },
      });
    });

    it("stores a logical deletion and its restoration", async () => {
      const admin = await insertUser(pool, { role: "ADMIN" });
      const user = newUser({ createdBy: admin });
      await repository.save(user);

      user.softDelete(admin, NOW);
      await repository.save(user);
      expect((await repository.findById(user.getId()))?.isDeleted()).toBe(true);

      user.restore(admin, NOW);
      await repository.save(user);
      const restored = await repository.findById(user.getId());
      expect(restored).toMatchObject({ deletedAt: undefined, deletedBy: undefined, active: true });
    });

    it("lets the database refuse a second current user with the same email", async () => {
      await repository.save(newUser({ email: "repetido@example.com" }));
      const duplicate = newUser({
        id: "4f9c1f43-6f4b-4d5c-9a3e-5b2d8c7a1e11",
        email: "REPETIDO@example.com",
      });

      // The use case checks existsByEmail first; this is the database backing it up (409).
      await expect(repository.save(duplicate)).rejects.toMatchObject({
        cause: expect.objectContaining({ code: "23505" }) as unknown,
      });
    });

    it("lets the database refuse to leave the system without an active admin", async () => {
      const admin = await insertUser(pool, { role: "ADMIN" });
      const user = await repository.findById(admin);
      // Skips UserAdministrationPolicy on purpose: the trigger is the last line of defense.
      user?.deactivate(admin, NOW);

      await expect(repository.save(user!)).rejects.toMatchObject({
        cause: expect.objectContaining({ code: "23514" }) as unknown,
      });
    });

    it("keeps the password change time the domain set, not the database clock", async () => {
      const id = await insertUser(pool);
      const user = await repository.findById(id);
      const changedAt = new Date("2026-10-22T12:00:00.000Z");
      user?.changePassword("new-hash", changedAt);

      await repository.save(user!);

      expect((await repository.findById(id))?.passwordChangedAt).toEqual(changedAt);
    });

    it("lets the database revoke the sessions when the password changes", async () => {
      const id = await insertUser(pool);
      await pool.query(
        `INSERT INTO libreria.sessions (user_id, refresh_token_hash, family_id, expires_at)
         VALUES ($1, 'token-hash', gen_random_uuid(), now() + interval '1 day')`,
        [id],
      );
      const user = await repository.findById(id);
      user?.changePassword("new-hash", NOW);

      await repository.save(user!);

      const { rows } = await pool.query<{ revoked_at: Date | null }>(
        "SELECT revoked_at FROM libreria.sessions WHERE user_id = $1",
        [id],
      );
      expect(rows[0].revoked_at).toBeInstanceOf(Date);
    });
  });

  describe("findByEmail", () => {
    it("finds a current user ignoring case", async () => {
      const id = await insertUser(pool, { email: "ana@example.com" });

      expect((await repository.findByEmail(Email.create("ANA@Example.com")))?.getId()).toBe(id);
    });

    it("finds a user whose row keeps the case it was loaded with", async () => {
      const id = await insertUser(pool, { email: "Ana@Example.com" });

      expect((await repository.findByEmail(Email.create("ana@example.com")))?.getId()).toBe(id);
    });

    it("ignores deleted users", async () => {
      const id = await insertUser(pool, { email: "ana@example.com" });
      await pool.query(
        "UPDATE libreria.users SET deleted_at = now(), is_active = false WHERE id = $1",
        [id],
      );

      await expect(repository.findByEmail(Email.create("ana@example.com"))).resolves.toBeNull();
    });
  });

  describe("existsByEmail", () => {
    it("is true when a current user has the email, ignoring case", async () => {
      await insertUser(pool, { email: "ana@example.com" });

      await expect(repository.existsByEmail(Email.create("Ana@example.com"))).resolves.toBe(true);
    });

    it("is false for an unused email", async () => {
      await expect(repository.existsByEmail(Email.create("nadie@example.com"))).resolves.toBe(
        false,
      );
    });

    it("ignores the user being edited", async () => {
      const id = await insertUser(pool, { email: "ana@example.com" });

      await expect(repository.existsByEmail(Email.create("ana@example.com"), id)).resolves.toBe(
        false,
      );
    });

    it("ignores deleted users, whose email can be reused", async () => {
      const id = await insertUser(pool, { email: "ana@example.com" });
      await pool.query(
        "UPDATE libreria.users SET deleted_at = now(), is_active = false WHERE id = $1",
        [id],
      );

      await expect(repository.existsByEmail(Email.create("ana@example.com"))).resolves.toBe(false);
    });
  });

  describe("concurrent changes", () => {
    const LOGIN_AT = new Date("2026-10-20T12:00:00.000Z");

    it("keeps a deletion made while a transaction was changing the same user", async () => {
      const id = await insertUser(pool, { mustChangePassword: false });
      let markRead: () => void = () => undefined;
      const read = new Promise<void>((resolve) => {
        markRead = resolve;
      });

      // A login reads the user, takes its time and saves the whole row.
      const login = transactions.run(async () => {
        const user = await repository.findById(id);
        markRead();
        await new Promise((resolve) => setTimeout(resolve, 300));
        user?.recordLogin(LOGIN_AT);
        await repository.save(user!);
      });
      await read;
      // Meanwhile an admin deletes the user; it has to wait for the login to finish.
      const deletion = pool.query(
        "UPDATE libreria.users SET deleted_at = now(), is_active = false WHERE id = $1",
        [id],
      );
      await Promise.all([login, deletion]);

      const stored = await repository.findById(id);
      expect(stored?.isDeleted()).toBe(true);
      expect(stored?.active).toBe(false);
      expect(stored?.lastLoginAt).toEqual(LOGIN_AT);
    });
  });

  describe("countOtherActiveAdmins", () => {
    it("counts only current, active admins other than the given one", async () => {
      const target = await insertUser(pool, { role: "ADMIN" });
      await insertUser(pool, { role: "ADMIN" });
      await insertUser(pool, { role: "ADMIN" });
      await insertUser(pool, { role: "ADMIN", isActive: false });
      await insertUser(pool, { role: "SELLER" });
      const deleted = await insertUser(pool, { role: "ADMIN" });
      await pool.query(
        "UPDATE libreria.users SET deleted_at = now(), is_active = false WHERE id = $1",
        [deleted],
      );

      await expect(repository.countOtherActiveAdmins(target)).resolves.toBe(2);
    });

    it("is zero when the given admin is the only one", async () => {
      const only = await insertUser(pool, { role: "ADMIN" });

      await expect(repository.countOtherActiveAdmins(only)).resolves.toBe(0);
    });
  });
});
