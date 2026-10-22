import { readFileSync } from "node:fs";
import path from "node:path";
import type { Pool } from "pg";
import { adminPool } from "./db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

describe("migrations (e2e)", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = adminPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates the seven tables in the libreria schema", async () => {
    const { rows } = await pool.query<{ table_name: string }>(
      `select table_name from information_schema.tables
       where table_schema = 'libreria' order by table_name`,
    );

    expect(rows.map((row) => row.table_name)).toEqual([
      "categories",
      "product_categories",
      "product_images",
      "products",
      "related_products",
      "sessions",
      "users",
    ]);
  });

  it("creates the enum types", async () => {
    const { rows } = await pool.query<{ typname: string }>(
      `select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace
       where n.nspname = 'libreria' and t.typtype = 'e' order by t.typname`,
    );

    expect(rows.map((row) => row.typname)).toEqual(["image_status", "user_role"]);
  });

  it("records one row per migration in the journal", async () => {
    const journal = JSON.parse(
      readFileSync(path.resolve(import.meta.dirname, "../../drizzle/meta/_journal.json"), "utf8"),
    ) as { entries: unknown[] };
    const { rows } = await pool.query<{ count: number }>(
      "select count(*)::int as count from drizzle.__drizzle_migrations",
    );

    expect(rows[0]?.count).toBe(journal.entries.length);
  });
});
