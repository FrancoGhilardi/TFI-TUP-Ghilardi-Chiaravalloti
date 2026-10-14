import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { PasswordHasher } from "../../src/modules/identity/application/ports/password-hasher.js";
import {
  seedAdmin,
  seedAdminInputSchema,
} from "../../src/modules/identity/infrastructure/seed-admin.js";
import * as schema from "../../src/shared/infrastructure/database/schema/index.js";
import { adminPool, truncateAll } from "./db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

class FakeHasher extends PasswordHasher {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed:${plain}`);
  }
  verify(hash: string, plain: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plain}`);
  }
}

const input = seedAdminInputSchema.parse({
  SEED_ADMIN_EMAIL: "  Admin@Example.com ",
  SEED_ADMIN_NAME: "Admin",
  SEED_ADMIN_PASSWORD: "long-enough-password",
});

describe("seedAdmin (e2e)", () => {
  let pool: Pool;

  const countUsers = async () => {
    const { rows } = await pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM libreria.users",
    );
    return rows[0]?.count;
  };

  beforeAll(() => {
    pool = adminPool();
  });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  const run = () => seedAdmin(drizzle({ client: pool, schema }), new FakeHasher(), input);

  it("creates the admin with a lowercase email and a forced password change", async () => {
    await expect(run()).resolves.toBe("created");

    const { rows } = await pool.query<{
      email: string;
      role: string;
      must_change_password: boolean;
      password_hash: string;
      created_by: string | null;
    }>("SELECT email, role, must_change_password, password_hash, created_by FROM libreria.users");
    expect(rows).toEqual([
      {
        email: "admin@example.com",
        role: "ADMIN",
        must_change_password: true,
        password_hash: "hashed:long-enough-password",
        created_by: null,
      },
    ]);
  });

  it("does not duplicate the admin on a second run", async () => {
    await run();

    await expect(run()).resolves.toBe("already-exists");
    expect(await countUsers()).toBe(1);
  });

  it("creates a new admin when the existing one was soft deleted", async () => {
    await pool.query(
      `INSERT INTO libreria.users (email, name, password_hash, role, is_active, deleted_at)
       VALUES ('old@example.com', 'Old admin', 'hash', 'ADMIN', false, now())`,
    );

    await expect(run()).resolves.toBe("created");
    expect(await countUsers()).toBe(2);
  });
});

describe("seedAdminInputSchema", () => {
  const valid = {
    SEED_ADMIN_EMAIL: "admin@example.com",
    SEED_ADMIN_NAME: "Admin",
    SEED_ADMIN_PASSWORD: "long-enough-password",
  };

  it("rejects a password shorter than 8 characters", () => {
    const result = seedAdminInputSchema.safeParse({ ...valid, SEED_ADMIN_PASSWORD: "1234567" });

    expect(result.success).toBe(false);
  });

  it("rejects a blank name and an invalid email", () => {
    expect(seedAdminInputSchema.safeParse({ ...valid, SEED_ADMIN_NAME: "  " }).success).toBe(false);
    expect(seedAdminInputSchema.safeParse({ ...valid, SEED_ADMIN_EMAIL: "nope" }).success).toBe(
      false,
    );
  });
});
