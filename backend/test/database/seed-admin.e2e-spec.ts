import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { z } from "zod";
import { PasswordHasher } from "../../src/modules/identity/application/ports/password-hasher.js";
import type { Password } from "../../src/modules/identity/domain/value-objects/password.js";
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
  hash(password: Password): Promise<string> {
    return Promise.resolve(`hashed:${password.reveal()}`);
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

  const parsePassword = (password: string) =>
    seedAdminInputSchema.safeParse({ ...valid, SEED_ADMIN_PASSWORD: password });

  it.each([
    ["shorter than 8 characters", "1234567"],
    ["longer than 128 characters", "a".repeat(129)],
    ["of four emojis, eight UTF-16 units", "🔒".repeat(4)],
  ])("rejects a password %s with the limits of the password policy", (_label, password) => {
    const result = parsePassword(password);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ["SEED_ADMIN_PASSWORD"],
        message: "Must have between 8 and 128 characters",
      }),
    ]);
  });

  it("rejects a password that is not valid Unicode", () => {
    const result = parsePassword("aaaaaaa\ud800");

    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ["SEED_ADMIN_PASSWORD"],
        message: "Contains characters that are not valid Unicode",
      }),
    ]);
  });

  it("does not print the rejected password in the error", () => {
    const result = parsePassword("short-1");

    expect(result.error && z.prettifyError(result.error)).not.toContain("short-1");
  });

  it.each([
    ["of exactly 8 characters", "a".repeat(8)],
    ["of exactly 128 characters", "a".repeat(128)],
    ["of eight emojis", "🔒".repeat(8)],
    ["with surrounding spaces, kept as typed", "  spaced out  "],
  ])("accepts a password %s and keeps its text", (_label, password) => {
    const result = parsePassword(password);

    expect(result.success).toBe(true);
    expect(result.data?.SEED_ADMIN_PASSWORD.reveal()).toBe(password);
  });

  it("does not expose the password when the parsed settings are serialized", () => {
    expect(JSON.stringify(input)).not.toContain("long-enough-password");
  });

  const parseName = (name: string) =>
    seedAdminInputSchema.safeParse({ ...valid, SEED_ADMIN_NAME: name });

  it.each([
    ["blank", "  "],
    ["longer than 120 characters", "a".repeat(121)],
  ])("rejects a %s name, as the domain does", (_label, name) => {
    expect(parseName(name).error?.issues).toEqual([
      expect.objectContaining({
        path: ["SEED_ADMIN_NAME"],
        message: "Must not be blank nor longer than 120 characters",
      }),
    ]);
  });

  it("counts the name in code points, like the domain and the database", () => {
    expect(parseName("🙂".repeat(120)).success).toBe(true);
  });

  it("trims the name through the domain value object", () => {
    expect(parseName("  Admin  ").data?.SEED_ADMIN_NAME.toString()).toBe("Admin");
  });

  const parseEmail = (email: string) =>
    seedAdminInputSchema.safeParse({ ...valid, SEED_ADMIN_EMAIL: email });

  it.each(["nope", "admin@", "admin@example", "ad min@example.com"])(
    "rejects the email %o, as the domain does",
    (email) => {
      expect(parseEmail(email).error?.issues).toEqual([
        expect.objectContaining({ path: ["SEED_ADMIN_EMAIL"], message: "Invalid email address" }),
      ]);
    },
  );

  it("trims and lowercases the email through the domain value object", () => {
    expect(parseEmail("  Admin@Example.COM ").data?.SEED_ADMIN_EMAIL.toString()).toBe(
      "admin@example.com",
    );
  });
});
