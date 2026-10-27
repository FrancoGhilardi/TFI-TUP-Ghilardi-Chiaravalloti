import type { INestApplication } from "@nestjs/common";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { Page } from "./../src/shared/application/pagination.js";
import type { ProductCardResult } from "./../src/modules/catalog/application/dto/product-card.result.js";
import type { ProductDetailResult } from "./../src/modules/catalog/application/dto/product-detail.result.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { createTestApp } from "./create-test-app.js";
import {
  adminPool,
  insertCategory,
  insertImage,
  insertProductWithDeps,
  truncateAll,
} from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

describe("GET /products and /products/:slug (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let categoryId: string;

  beforeAll(() => {
    pool = adminPool();
  });

  // A fresh app per test starts the rate limits at zero.
  beforeEach(async () => {
    await truncateAll(pool);
    app = await createTestApp();
    http = request(app.getHttpServer());
    categoryId = await insertCategory(pool, "Cuadernos");
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await pool.end();
  });

  /** A product with its first image processed, as the store needs it. */
  async function shown(title: string, sortOrder = 0): Promise<string> {
    const { id } = await insertProductWithDeps(pool, { title, categoryId });
    await processImage(id, 1);
    await pool.query("UPDATE libreria.products SET sort_order = $2 WHERE id = $1", [id, sortOrder]);
    return id;
  }

  async function processImage(productId: string, position: number): Promise<void> {
    await pool.query(
      `UPDATE libreria.product_images
       SET status = 'PROCESSED', public_key = 'products/' || product_id || '/' || id || '.webp'
       WHERE product_id = $1 AND position = $2`,
      [productId, position],
    );
  }

  const set = (id: string, assignment: string) =>
    pool.query(`UPDATE libreria.products SET ${assignment} WHERE id = $1`, [id]);

  describe("GET /products", () => {
    it("lists only active, not deleted products, to anyone and cacheable", async () => {
      const active = await shown("Cuaderno A4", 0);
      const inactive = await shown("Inactivo", 1);
      const deleted = await shown("Borrado", 2);
      await set(inactive, "is_active = false");
      await set(deleted, "deleted_at = now()");

      const response = await http.get("/api/v1/products").expect(200);

      expect(response.headers["cache-control"]).toBe("public, max-age=60");
      const body = response.body as Page<ProductCardResult>;
      expect(body.items.map((card) => card.id)).toEqual([active]);
      expect(body).toMatchObject({ page: 1, limit: 20, totalItems: 1, totalPages: 1 });
    });

    it("gives each card its processed image from the public storage and its category", async () => {
      await shown("Cuaderno A4");

      const response = await http.get("/api/v1/products").expect(200);

      const [card] = (response.body as Page<ProductCardResult>).items;
      expect(card).toMatchObject({
        slug: "cuaderno-a4",
        price: "10.00",
        category: { id: categoryId, name: "Cuadernos", slug: "cuadernos" },
      });
      expect(card.image.url).toMatch(
        /\/storage\/v1\/object\/public\/product-images\/products\/.+\.webp$/,
      );
    });

    it("filters by category and pages the results", async () => {
      const other = await insertCategory(pool, "Lápices");
      const first = await shown("Primero", 0);
      await shown("Segundo", 1);
      const { id: elsewhere } = await insertProductWithDeps(pool, {
        title: "Lápiz",
        categoryId: other,
      });
      await processImage(elsewhere, 1);

      const filtered = await http
        .get("/api/v1/products")
        .query({ categorySlug: "cuadernos", limit: 1 })
        .expect(200);

      const body = filtered.body as Page<ProductCardResult>;
      expect(body.items.map((card) => card.id)).toEqual([first]);
      expect(body).toMatchObject({ limit: 1, totalItems: 2, totalPages: 2 });
    });

    it.each([[{ limit: 51 }], [{ page: 0 }], [{ sort: "PRICE" }]])(
      "refuses %o with 400",
      async (query) => {
        const response = await http.get("/api/v1/products").query(query).expect(400);

        expect((response.body as ErrorResponse).code).toBe("VALIDATION_FAILED");
      },
    );
  });

  describe("GET /products/:slug", () => {
    it("gives the product with its processed images, its categories and its related products", async () => {
      const id = await shown("Cuaderno A4");
      await insertImage(pool, id, 2);
      await insertImage(pool, id, 3);
      await processImage(id, 3);
      const related = await shown("Cuaderno Rayado", 1);

      const response = await http.get("/api/v1/products/cuaderno-a4").expect(200);

      expect(response.headers["cache-control"]).toBe("public, max-age=60");
      const body = response.body as ProductDetailResult;
      expect(body).toMatchObject({
        id,
        slug: "cuaderno-a4",
        title: "Cuaderno A4",
        price: "10.00",
        isOnSale: false,
        salePrice: null,
        primaryCategory: { id: categoryId, name: "Cuadernos", slug: "cuadernos" },
        categories: [{ id: categoryId, name: "Cuadernos", slug: "cuadernos" }],
        relatedProducts: [{ id: related, slug: "cuaderno-rayado" }],
      });
      expect(body.images.map((image) => image.position)).toEqual([1, 3]);
      expect(body.images.every((image) => image.url.endsWith(".webp"))).toBe(true);
    });

    it("completes the related products only from a primary category the store shows", async () => {
      await shown("Cuaderno A4");
      await shown("Cuaderno Rayado", 1);
      await pool.query("UPDATE libreria.categories SET is_active = false WHERE id = $1", [
        categoryId,
      ]);

      const response = await http.get("/api/v1/products/cuaderno-a4").expect(200);

      expect(response.body).toMatchObject({ primaryCategory: null, relatedProducts: [] });
    });

    it.each([
      ["inactive", "is_active = false"],
      ["deleted", "deleted_at = now()"],
    ])("answers 404 for an %s product, without caching the answer", async (_label, assignment) => {
      const id = await shown("Cuaderno A4");
      await set(id, assignment);

      const response = await http.get("/api/v1/products/cuaderno-a4").expect(404);

      expect((response.body as ErrorResponse).code).toBe("PRODUCT_NOT_FOUND");
      expect(response.headers["cache-control"]).toBe("no-store");
    });

    it("answers 404 for a product without a processed image yet", async () => {
      await insertProductWithDeps(pool, { title: "Cuaderno A4", categoryId });

      await http.get("/api/v1/products/cuaderno-a4").expect(404);
    });

    it.each(["Cuaderno-A4", "desconocido"])("answers 404 for %o", async (slug) => {
      const response = await http.get(`/api/v1/products/${slug}`).expect(404);

      expect((response.body as ErrorResponse).code).toBe("PRODUCT_NOT_FOUND");
    });
  });
});
