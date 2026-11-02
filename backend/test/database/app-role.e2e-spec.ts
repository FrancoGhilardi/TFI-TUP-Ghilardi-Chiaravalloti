import type { Pool } from "pg";
import {
  adminPool,
  appPool,
  inTransaction,
  insertCategory,
  insertProductWithDeps,
  insertUser,
  truncateAll,
} from "./db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const INSUFFICIENT_PRIVILEGE = "42501";

describe("application role (e2e)", () => {
  let admin: Pool;
  let app: Pool;

  const expectPgError = (work: Promise<unknown>, code: string) =>
    expect(work).rejects.toMatchObject({ code });

  beforeAll(() => {
    admin = adminPool();
    app = appPool();
  });

  beforeEach(async () => {
    await truncateAll(admin);
  });

  afterAll(async () => {
    await app.end();
    await admin.end();
  });

  it("connects as libreria_app", async () => {
    const { rows } = await app.query<{ current_user: string }>("SELECT current_user");

    expect(rows[0]?.current_user).toBe("libreria_app");
  });

  it("reads and writes the libreria tables", async () => {
    const categoryId = await insertCategory(app, "Books");

    await app.query("UPDATE libreria.categories SET sort_order = 2 WHERE id = $1", [categoryId]);
    const { rows } = await app.query<{ sort_order: number }>(
      "SELECT sort_order FROM libreria.categories WHERE id = $1",
      [categoryId],
    );
    await app.query("DELETE FROM libreria.categories WHERE id = $1", [categoryId]);

    expect(rows[0]?.sort_order).toBe(2);
  });

  it("inserts a product using the SKU sequence", async () => {
    await insertProductWithDeps(app, { title: "Notebook" });

    const { rows } = await app.query<{ sku: string }>("SELECT sku FROM libreria.products");

    expect(rows[0]?.sku).toBe("LMS-000001");
  });

  it("searches titles with the unaccent wrapper from the extensions schema", async () => {
    await insertProductWithDeps(app, { title: "Lápiz" });

    const { rows } = await app.query(
      `SELECT 1 FROM libreria.products
       WHERE libreria.immutable_unaccent(title) ILIKE libreria.immutable_unaccent('%lapiz%')`,
    );

    expect(rows).toHaveLength(1);
  });

  it("revokes sessions when the password changes", async () => {
    const userId = await insertUser(app);
    await app.query(
      `INSERT INTO libreria.sessions (user_id, refresh_token_hash, expires_at)
       VALUES ($1, 'token-hash', now() + interval '1 day')`,
      [userId],
    );

    await app.query("UPDATE libreria.users SET password_hash = 'new-hash' WHERE id = $1", [userId]);

    const { rows } = await app.query<{ revoked_at: Date | null }>(
      "SELECT revoked_at FROM libreria.sessions",
    );
    expect(rows[0]?.revoked_at).not.toBeNull();
  });

  it.each([
    ["creating a table", "CREATE TABLE libreria.x (id int)"],
    ["altering a table", "ALTER TABLE libreria.products ADD COLUMN x int"],
    ["truncating a table", "TRUNCATE libreria.products"],
    ["reading the auth schema", "SELECT * FROM auth.users"],
  ])("denies %s", async (_action, statement) => {
    await expectPgError(app.query(statement), INSUFFICIENT_PRIVILEGE);
  });

  it("denies the anon role access to the libreria schema", async () => {
    await expectPgError(
      inTransaction(admin, async (client) => {
        await client.query("SET LOCAL ROLE anon");
        await client.query("SELECT * FROM libreria.users");
      }),
      INSUFFICIENT_PRIVILEGE,
    );
  });

  it("compares citext columns case-insensitively", async () => {
    await insertUser(app, { email: "probe@example.com" });

    const { rows } = await app.query(
      "SELECT 1 FROM libreria.users WHERE email = 'PROBE@EXAMPLE.COM'",
    );

    expect(rows).toHaveLength(1);
  });

  it("limits the statement duration", async () => {
    const { rows } = await app.query<{ statement_timeout: string }>("SHOW statement_timeout");

    expect(rows[0]?.statement_timeout).toBe("15s");
  });
});
