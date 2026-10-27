import type { ConfigService } from "@nestjs/config";
import type { Pool } from "pg";
import type { Env } from "../../src/config/env.js";
import { DrizzleCatalogQueries } from "../../src/modules/catalog/infrastructure/persistence/drizzle-catalog.queries.js";
import { FileStorage } from "../../src/shared/application/file-storage.js";
import { DrizzleClient } from "../../src/shared/infrastructure/database/drizzle.client.js";
import { DrizzleExecutor } from "../../src/shared/infrastructure/database/drizzle.executor.js";
import {
  adminPool,
  insertCategory,
  insertImage,
  insertProductWithDeps,
  truncateAll,
} from "./db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const NOW = new Date("2026-10-22T12:00:00.000Z");
const BEFORE = new Date("2026-10-01T12:00:00.000Z");
const LATER = new Date("2026-11-22T12:00:00.000Z");

/** Only builds addresses; the queries never call Storage. */
class PublicStorage extends FileStorage {
  upload(): Promise<void> {
    return Promise.reject(new Error("Not used"));
  }
  remove(): Promise<void> {
    return Promise.reject(new Error("Not used"));
  }
  signedUrls(): Promise<(string | null)[]> {
    return Promise.reject(new Error("Not used"));
  }
  publicUrl(key: string): string {
    return `public://${key}`;
  }
}

describe("DrizzleCatalogQueries (e2e)", () => {
  let pool: Pool;
  let client: DrizzleClient;
  let queries: DrizzleCatalogQueries;
  let categoryId: string;

  beforeAll(() => {
    pool = adminPool();
    // Runs with the runtime role, so it also checks that role can read the tables.
    const values: Record<string, unknown> = {
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_SSL_MODE: process.env.DATABASE_SSL_MODE ?? "disable",
      DATABASE_SSL_CA: process.env.DATABASE_SSL_CA,
      DATABASE_POOL_MAX: 3,
    };
    client = new DrizzleClient({ get: (key: string) => values[key] } as ConfigService<Env, true>);
    queries = new DrizzleCatalogQueries(new DrizzleExecutor(client), new PublicStorage());
  });

  beforeEach(async () => {
    await truncateAll(pool);
    categoryId = await insertCategory(pool, "Cuadernos");
  });

  afterAll(async () => {
    await truncateAll(pool);
    await client.onApplicationShutdown();
    await pool.end();
  });

  /** Processes the image at `position` of the product, giving it a public version. */
  async function processImage(productId: string, position = 1): Promise<string> {
    const { rows } = await pool.query<{ public_key: string }>(
      `UPDATE libreria.product_images
       SET status = 'PROCESSED', public_key = 'public/' || id || '.webp', width = 800, height = 600
       WHERE product_id = $1 AND position = $2
       RETURNING public_key`,
      [productId, position],
    );
    return rows[0].public_key;
  }

  /** A visible product: active, current and with its image processed. */
  async function visible(
    title: string,
    options: { category?: string; sortOrder?: number; createdAt?: Date } = {},
  ): Promise<string> {
    const { id } = await insertProductWithDeps(pool, {
      title,
      categoryId: options.category ?? categoryId,
    });
    await processImage(id);
    await pool.query(
      "UPDATE libreria.products SET sort_order = $2, created_at = $3 WHERE id = $1",
      [id, options.sortOrder ?? 0, options.createdAt ?? BEFORE],
    );
    return id;
  }

  async function childCategory(name: string, parentId: string): Promise<string> {
    const id = await insertCategory(pool, name);
    await pool.query("UPDATE libreria.categories SET parent_id = $2 WHERE id = $1", [id, parentId]);
    return id;
  }

  const page = (query: Partial<{ categorySlug: string; page: number; limit: number }> = {}) =>
    queries.findPage({ page: 1, limit: 20, ...query }, NOW);

  const idsOf = (cards: { id: string }[]) => cards.map((card) => card.id);

  describe("findPage", () => {
    it("lists only active, current products with a processed image, as cards", async () => {
      const shown = await visible("Cuaderno A4");
      const inactive = await visible("Inactivo");
      await pool.query("UPDATE libreria.products SET is_active = false WHERE id = $1", [inactive]);
      const deleted = await visible("Borrado");
      await pool.query("UPDATE libreria.products SET deleted_at = now() WHERE id = $1", [deleted]);
      await insertProductWithDeps(pool, { title: "Sin procesar", categoryId });

      const result = await page();

      const [key] = (
        await pool.query<{ public_key: string }>(
          "SELECT public_key FROM libreria.product_images WHERE product_id = $1",
          [shown],
        )
      ).rows.map((row) => row.public_key);
      expect(result).toEqual({
        items: [
          {
            id: shown,
            slug: "cuaderno-a4",
            title: "Cuaderno A4",
            price: "10.00",
            salePrice: null,
            isOnSale: false,
            isNew: false,
            isFeatured: false,
            image: {
              id: expect.any(String) as string,
              position: 1,
              url: `public://${key}`,
              altText: null,
              width: 800,
              height: 600,
            },
            category: { id: categoryId, name: "Cuadernos", slug: "cuadernos" },
          },
        ],
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
      });
    });

    it("shows the first processed image, skipping pending ones", async () => {
      const id = await visible("Cuaderno");
      await insertImage(pool, id, 2);
      await insertImage(pool, id, 3);
      await processImage(id, 3);
      await pool.query(
        "UPDATE libreria.product_images SET status = 'PENDING', public_key = NULL WHERE product_id = $1 AND position = 1",
        [id],
      );

      const [card] = (await page()).items;

      expect(card.image.position).toBe(3);
    });

    it("follows the store order: position, then the newest first", async () => {
      const older = await visible("Viejo", { createdAt: BEFORE });
      const newer = await visible("Nuevo", { createdAt: NOW });
      const first = await visible("Primero", { createdAt: BEFORE });
      await pool.query("UPDATE libreria.products SET sort_order = 1 WHERE id IN ($1, $2)", [
        older,
        newer,
      ]);

      expect(idsOf((await page()).items)).toEqual([first, newer, older]);
    });

    it("pages the results with their totals", async () => {
      const ids = [];
      for (let order = 0; order < 3; order++) {
        ids.push(await visible(`Producto ${order}`, { sortOrder: order }));
      }

      const second = await page({ page: 2, limit: 2 });

      expect(idsOf(second.items)).toEqual([ids[2]]);
      expect(second).toMatchObject({ page: 2, limit: 2, totalItems: 3, totalPages: 2 });
    });

    it("still counts the total past the last page, without products that are not visible", async () => {
      await visible("Uno");
      await visible("Dos");
      await insertProductWithDeps(pool, { title: "Sin procesar", categoryId });

      await expect(page({ page: 5, limit: 1 })).resolves.toMatchObject({
        items: [],
        totalItems: 2,
        totalPages: 2,
      });
      await expect(page({ categorySlug: "desconocida", page: 3 })).resolves.toMatchObject({
        totalItems: 0,
      });
    });

    it("filters by a category and every visible one below it", async () => {
      const child = await childCategory("Rayados", categoryId);
      const grandchild = await childCategory("A4", child);
      const other = await insertCategory(pool, "Lápices");
      const inParent = await visible("En el padre", { sortOrder: 0 });
      const inChild = await visible("En la hija", { category: child, sortOrder: 1 });
      const inGrandchild = await visible("En la nieta", { category: grandchild, sortOrder: 2 });
      await visible("En otra", { category: other });

      expect(idsOf((await page({ categorySlug: "cuadernos" })).items)).toEqual([
        inParent,
        inChild,
        inGrandchild,
      ]);
      expect(idsOf((await page({ categorySlug: "rayados" })).items)).toEqual([
        inChild,
        inGrandchild,
      ]);

      // A hidden category hides its branch from the filter.
      await pool.query("UPDATE libreria.categories SET is_active = false WHERE id = $1", [child]);
      await expect(page({ categorySlug: "a4" })).resolves.toMatchObject({ totalItems: 0 });
      expect(idsOf((await page({ categorySlug: "cuadernos" })).items)).toEqual([inParent]);
      await expect(page({ categorySlug: "desconocida" })).resolves.toMatchObject({
        items: [],
        totalItems: 0,
      });
    });

    it("leaves the category out of the card while it is hidden, still listing the product", async () => {
      const id = await visible("Cuaderno");
      await pool.query("UPDATE libreria.categories SET is_active = false WHERE id = $1", [
        categoryId,
      ]);

      const [card] = (await page()).items;

      expect(card).toMatchObject({ id, category: null });
    });

    it("counts a sale and a new mark only while they run", async () => {
      const running = await visible("Vigente", { sortOrder: 0 });
      const ended = await visible("Vencida", { sortOrder: 1 });
      await pool.query(
        "UPDATE libreria.products SET is_on_sale = true, sale_price = 5, sale_ends_at = $2, is_new = true, new_until = $2 WHERE id = $1",
        [running, LATER],
      );
      await pool.query(
        "UPDATE libreria.products SET is_on_sale = true, sale_price = 5, sale_ends_at = $2, is_new = true, new_until = $2 WHERE id = $1",
        [ended, BEFORE],
      );

      const [first, second] = (await page()).items;

      expect(first).toMatchObject({ isOnSale: true, salePrice: "5.00", isNew: true });
      expect(second).toMatchObject({ isOnSale: false, salePrice: null, isNew: false });
    });
  });

  describe("findPageBySlug", () => {
    it("gives the processed images in order and only the visible categories", async () => {
      const id = await visible("Cuaderno A4");
      await insertImage(pool, id, 2);
      await insertImage(pool, id, 3);
      await processImage(id, 3);
      const hidden = await insertCategory(pool, "Oculta");
      const shown = await insertCategory(pool, "Escolar");
      await pool.query("UPDATE libreria.categories SET is_active = false WHERE id = $1", [hidden]);
      await pool.query(
        "INSERT INTO libreria.product_categories (product_id, category_id, is_primary) VALUES ($1, $2, false), ($1, $3, false)",
        [id, hidden, shown],
      );
      await pool.query(
        "UPDATE libreria.products SET description = 'Tapa dura', stock = 4, is_on_sale = true, sale_price = 5, sale_ends_at = $2 WHERE id = $1",
        [id, LATER],
      );

      const result = await queries.findPageBySlug("cuaderno-a4", NOW);

      expect(result).toMatchObject({
        id,
        slug: "cuaderno-a4",
        title: "Cuaderno A4",
        description: "Tapa dura",
        price: "10.00",
        salePrice: "5.00",
        isOnSale: true,
        saleEndsAt: LATER,
        stock: 4,
        primaryCategory: { id: categoryId, name: "Cuadernos", slug: "cuadernos" },
        categories: [
          { id: categoryId, name: "Cuadernos", slug: "cuadernos" },
          { id: shown, name: "Escolar", slug: "escolar" },
        ],
      });
      expect(result?.images.map((image) => image.position)).toEqual([1, 3]);
    });

    it("shows no primary category while it is hidden", async () => {
      await visible("Cuaderno");
      await pool.query("UPDATE libreria.categories SET deleted_at = now() WHERE id = $1", [
        categoryId,
      ]);

      const result = await queries.findPageBySlug("cuaderno", NOW);

      expect(result).toMatchObject({ primaryCategory: null, categories: [] });
    });

    it("finds no product the store does not show", async () => {
      const id = await visible("Cuaderno");
      await pool.query("UPDATE libreria.products SET is_active = false WHERE id = $1", [id]);
      await insertProductWithDeps(pool, { title: "Sin procesar", categoryId });

      await expect(queries.findPageBySlug("cuaderno", NOW)).resolves.toBeNull();
      await expect(queries.findPageBySlug("sin-procesar", NOW)).resolves.toBeNull();
      await expect(queries.findPageBySlug("desconocido", NOW)).resolves.toBeNull();
    });
  });

  describe("related products", () => {
    it("gives the visible ones set by hand, in their order and up to the limit", async () => {
      const id = await visible("Cuaderno");
      const second = await visible("Segundo");
      const first = await visible("Primero");
      const hidden = await visible("Oculto");
      const third = await visible("Tercero");
      await pool.query("UPDATE libreria.products SET is_active = false WHERE id = $1", [hidden]);
      await pool.query(
        `INSERT INTO libreria.related_products (product_id, related_product_id, sort_order)
         VALUES ($1, $2, 0), ($1, $3, 1), ($1, $4, 2), ($1, $5, 3)`,
        [id, first, hidden, second, third],
      );

      expect(idsOf(await queries.findManualRelated(id, 4, NOW))).toEqual([first, second, third]);
      expect(idsOf(await queries.findManualRelated(id, 2, NOW))).toEqual([first, second]);
    });

    it("gives visible products with the same primary category, leaving out the given ones", async () => {
      const id = await visible("Cuaderno", { sortOrder: 0 });
      const kept = await visible("Mismo", { sortOrder: 1 });
      const excluded = await visible("Excluido", { sortOrder: 2 });
      const other = await insertCategory(pool, "Lápices");
      const secondary = await visible("Secundaria", { category: other });
      await pool.query(
        "INSERT INTO libreria.product_categories (product_id, category_id, is_primary) VALUES ($1, $2, false)",
        [secondary, categoryId],
      );

      expect(
        idsOf(await queries.findByPrimaryCategory(categoryId, [id, excluded], 4, NOW)),
      ).toEqual([kept]);
    });
  });
});
