import type { Pool } from "pg";
import {
  adminPool,
  inTransaction,
  insertCategory,
  insertImage,
  insertProductWithDeps,
  insertUser,
  truncateAll,
} from "./db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

describe("business rules in the database (e2e)", () => {
  let pool: Pool;

  const expectPgError = (work: Promise<unknown>, code: string) =>
    expect(work).rejects.toMatchObject({ code });

  beforeAll(() => {
    pool = adminPool();
  });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("products", () => {
    it("generates sequential SKUs", async () => {
      await insertProductWithDeps(pool, { title: "First" });
      await insertProductWithDeps(pool, { title: "Second" });

      const { rows } = await pool.query<{ sku: string }>(
        "SELECT sku FROM libreria.products ORDER BY sku",
      );

      expect(rows.map((row) => row.sku)).toEqual(["LMS-000001", "LMS-000002"]);
    });

    it("rejects changing the SKU", async () => {
      await insertProductWithDeps(pool);

      await expectPgError(
        pool.query("UPDATE libreria.products SET sku = 'LMS-999999'"),
        CHECK_VIOLATION,
      );
    });

    it("rejects changing the slug", async () => {
      await insertProductWithDeps(pool);

      await expectPgError(
        pool.query("UPDATE libreria.products SET slug = 'other'"),
        CHECK_VIOLATION,
      );
    });

    it("allows updating other columns when the slug does not change", async () => {
      await insertProductWithDeps(pool);

      await pool.query("UPDATE libreria.products SET slug = slug, title = 'Renamed'");

      const { rows } = await pool.query<{ title: string }>("SELECT title FROM libreria.products");
      expect(rows[0]?.title).toBe("Renamed");
    });

    it("refreshes updated_at on update", async () => {
      await insertProductWithDeps(pool);

      await pool.query("UPDATE libreria.products SET stock = 5");

      const { rows } = await pool.query<{ later: boolean }>(
        "SELECT updated_at > created_at AS later FROM libreria.products",
      );
      expect(rows[0]?.later).toBe(true);
    });

    it("rejects a sale price that is not lower than the price", async () => {
      await expectPgError(
        inTransaction(pool, async (client) => {
          await client.query(
            "INSERT INTO libreria.products (title, slug, price, sale_price, is_on_sale) VALUES ('P', 'p', 10, 10, true)",
          );
        }),
        CHECK_VIOLATION,
      );
    });

    it("finds a title ignoring accents", async () => {
      await insertProductWithDeps(pool, { title: "Lápiz" });

      const { rows } = await pool.query(
        `SELECT 1 FROM libreria.products
         WHERE libreria.immutable_unaccent(title) ILIKE libreria.immutable_unaccent('%lapiz%')`,
      );

      expect(rows).toHaveLength(1);
    });
  });

  describe("categories", () => {
    it("rejects changing the slug", async () => {
      await insertCategory(pool, "Books");

      await expectPgError(
        pool.query("UPDATE libreria.categories SET slug = 'other'"),
        CHECK_VIOLATION,
      );
    });

    it("refreshes updated_at on update", async () => {
      await insertCategory(pool, "Books");

      await pool.query("UPDATE libreria.categories SET sort_order = 3");

      const { rows } = await pool.query<{ later: boolean }>(
        "SELECT updated_at > created_at AS later FROM libreria.categories",
      );
      expect(rows[0]?.later).toBe(true);
    });
  });

  describe("product categories and images", () => {
    it("requires a category when the transaction commits", async () => {
      await expectPgError(
        inTransaction(pool, async (client) => {
          const { rows } = await client.query<{ id: string }>(
            "INSERT INTO libreria.products (title, slug, price) VALUES ('P', 'p', 10) RETURNING id",
          );
          await insertImage(client, rows[0].id, 1);
        }),
        CHECK_VIOLATION,
      );
    });

    it("requires an image when the transaction commits", async () => {
      await expectPgError(
        inTransaction(pool, async (client) => {
          const categoryId = await insertCategory(client);
          const { rows } = await client.query<{ id: string }>(
            "INSERT INTO libreria.products (title, slug, price) VALUES ('P', 'p', 10) RETURNING id",
          );
          await client.query(
            "INSERT INTO libreria.product_categories (product_id, category_id, is_primary) VALUES ($1, $2, true)",
            [rows[0].id, categoryId],
          );
        }),
        CHECK_VIOLATION,
      );
    });

    it("rejects removing the last category of a product", async () => {
      await insertProductWithDeps(pool);

      await expectPgError(pool.query("DELETE FROM libreria.product_categories"), CHECK_VIOLATION);
    });

    it("rejects removing the last image of a product", async () => {
      await insertProductWithDeps(pool);

      await expectPgError(pool.query("DELETE FROM libreria.product_images"), CHECK_VIOLATION);
    });

    it("allows deleting a whole product", async () => {
      const { id } = await insertProductWithDeps(pool);

      await pool.query("DELETE FROM libreria.products WHERE id = $1", [id]);

      const { rows } = await pool.query("SELECT 1 FROM libreria.product_categories");
      expect(rows).toHaveLength(0);
    });

    it("allows a single primary category per product", async () => {
      const { id } = await insertProductWithDeps(pool);
      const secondCategory = await insertCategory(pool);

      await expectPgError(
        pool.query(
          "INSERT INTO libreria.product_categories (product_id, category_id, is_primary) VALUES ($1, $2, true)",
          [id, secondCategory],
        ),
        UNIQUE_VIOLATION,
      );
    });

    it("rejects a sixth image position", async () => {
      const { id } = await insertProductWithDeps(pool);

      await expectPgError(insertImage(pool, id, 6), CHECK_VIOLATION);
    });

    it("reorders images with separate statements when the position constraint is deferred", async () => {
      const { id } = await insertProductWithDeps(pool);
      const second = await insertImage(pool, id, 2);
      const first = (
        await pool.query<{ id: string }>(
          "SELECT id FROM libreria.product_images WHERE product_id = $1 AND position = 1",
          [id],
        )
      ).rows[0].id;

      await inTransaction(pool, async (client) => {
        await client.query("SET CONSTRAINTS libreria.uq_product_images_position DEFERRED");
        await client.query("UPDATE libreria.product_images SET position = 2 WHERE id = $1", [
          first,
        ]);
        await client.query("UPDATE libreria.product_images SET position = 1 WHERE id = $1", [
          second,
        ]);
      });

      const { rows } = await pool.query<{ id: string }>(
        "SELECT id FROM libreria.product_images WHERE product_id = $1 ORDER BY position",
        [id],
      );
      expect(rows.map((row) => row.id)).toEqual([second, first]);
    });

    it("rejects moving an image onto a taken position when not deferred", async () => {
      const { id } = await insertProductWithDeps(pool);
      await insertImage(pool, id, 2);

      await expectPgError(
        inTransaction(pool, async (client) => {
          await client.query(
            "UPDATE libreria.product_images SET position = 2 WHERE product_id = $1 AND position = 1",
            [id],
          );
          await client.query(
            "UPDATE libreria.product_images SET position = 1 WHERE product_id = $1 AND position = 2",
            [id],
          );
        }),
        UNIQUE_VIOLATION,
      );
    });

    it("rejects a product related to itself", async () => {
      const { id } = await insertProductWithDeps(pool);

      await expectPgError(
        pool.query(
          "INSERT INTO libreria.related_products (product_id, related_product_id) VALUES ($1, $1)",
          [id],
        ),
        CHECK_VIOLATION,
      );
    });
  });

  describe("users", () => {
    it.each([
      ["deactivating", "is_active = false"],
      ["soft deleting", "deleted_at = now()"],
      ["demoting", "role = 'SELLER'"],
    ])("rejects %s the only active admin", async (_action, assignment) => {
      const adminId = await insertUser(pool, { role: "ADMIN" });

      await expectPgError(
        pool.query(`UPDATE libreria.users SET ${assignment} WHERE id = $1`, [adminId]),
        CHECK_VIOLATION,
      );
    });

    it("rejects deleting the only active admin", async () => {
      const adminId = await insertUser(pool, { role: "ADMIN" });

      await expectPgError(
        pool.query("DELETE FROM libreria.users WHERE id = $1", [adminId]),
        CHECK_VIOLATION,
      );
    });

    it("allows deactivating an admin when another one remains", async () => {
      const first = await insertUser(pool, { role: "ADMIN" });
      await insertUser(pool, { role: "ADMIN" });

      await pool.query("UPDATE libreria.users SET is_active = false WHERE id = $1", [first]);

      const { rows } = await pool.query<{ is_active: boolean }>(
        "SELECT is_active FROM libreria.users WHERE id = $1",
        [first],
      );
      expect(rows[0]?.is_active).toBe(false);
    });

    it.each([
      ["password_hash", "password_hash = 'new-hash'"],
      ["role", "role = 'ADMIN'"],
      ["is_active", "is_active = false"],
      ["deleted_at", "deleted_at = now()"],
    ])("revokes open sessions when %s changes", async (_column, assignment) => {
      const userId = await insertUser(pool);
      await pool.query(
        `INSERT INTO libreria.sessions (user_id, refresh_token_hash, family_id, expires_at)
         VALUES ($1, 'token-hash', gen_random_uuid(), now() + interval '1 day')`,
        [userId],
      );

      await pool.query(`UPDATE libreria.users SET ${assignment} WHERE id = $1`, [userId]);

      const { rows } = await pool.query<{ revoked_at: Date | null }>(
        "SELECT revoked_at FROM libreria.sessions",
      );
      expect(rows[0]?.revoked_at).not.toBeNull();
    });

    it("records password_changed_at when the password changes", async () => {
      const userId = await insertUser(pool);

      await pool.query("UPDATE libreria.users SET password_hash = 'new-hash' WHERE id = $1", [
        userId,
      ]);

      const { rows } = await pool.query<{ password_changed_at: Date | null }>(
        "SELECT password_changed_at FROM libreria.users WHERE id = $1",
        [userId],
      );
      expect(rows[0]?.password_changed_at).not.toBeNull();
    });

    const passwordChangedAt = async (userId: string) => {
      const { rows } = await pool.query<{ password_changed_at: Date | null }>(
        "SELECT password_changed_at FROM libreria.users WHERE id = $1",
        [userId],
      );
      return rows[0]?.password_changed_at;
    };

    it("keeps the password_changed_at the application sets with the new password", async () => {
      const userId = await insertUser(pool);
      const fromApp = new Date("2026-10-22T12:00:00.000Z");

      await pool.query(
        "UPDATE libreria.users SET password_hash = 'new-hash', password_changed_at = $1 WHERE id = $2",
        [fromApp, userId],
      );

      expect(await passwordChangedAt(userId)).toEqual(fromApp);
    });

    it("still fills password_changed_at in when a later change leaves the date as it was", async () => {
      const userId = await insertUser(pool);
      const earlier = new Date("2020-01-01T00:00:00.000Z");
      await pool.query(
        "UPDATE libreria.users SET password_hash = 'first-hash', password_changed_at = $1 WHERE id = $2",
        [earlier, userId],
      );

      await pool.query("UPDATE libreria.users SET password_hash = 'second-hash' WHERE id = $1", [
        userId,
      ]);

      expect((await passwordChangedAt(userId))?.getTime()).toBeGreaterThan(earlier.getTime());
    });

    it("rejects the same email in a different case among active users", async () => {
      await insertUser(pool, { email: "A@x.com" });

      await expectPgError(insertUser(pool, { email: "a@x.com" }), UNIQUE_VIOLATION);
    });

    it("allows registering again an email whose user was soft deleted", async () => {
      const userId = await insertUser(pool, { email: "a@x.com" });
      await pool.query("UPDATE libreria.users SET deleted_at = now() WHERE id = $1", [userId]);

      await expect(insertUser(pool, { email: "a@x.com" })).resolves.toBeTypeOf("string");
    });

    it("rejects a temporary password hash without an expiry", async () => {
      const userId = await insertUser(pool);

      await expectPgError(
        pool.query("UPDATE libreria.users SET temporary_password_hash = 'tmp' WHERE id = $1", [
          userId,
        ]),
        CHECK_VIOLATION,
      );
    });
  });
});
