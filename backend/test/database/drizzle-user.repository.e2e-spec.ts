import type { ConfigService } from "@nestjs/config";
import type { Pool } from "pg";
import type { Env } from "../../src/config/env.js";
import { UserRole } from "../../src/modules/identity/domain/user-role.js";
import { DrizzleUserRepository } from "../../src/modules/identity/infrastructure/persistence/drizzle-user.repository.js";
import { DrizzleClient } from "../../src/shared/infrastructure/database/drizzle.client.js";
import { DrizzleExecutor } from "../../src/shared/infrastructure/database/drizzle.executor.js";
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
    repository = new DrizzleUserRepository(new DrizzleExecutor(client));
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
    expect(user).toMatchObject({
      name: "Test user",
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
});
