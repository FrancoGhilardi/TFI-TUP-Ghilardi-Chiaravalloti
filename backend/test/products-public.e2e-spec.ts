import type { INestApplication } from "@nestjs/common";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { Page } from "./../src/shared/application/pagination.js";
import type { ProductCardResult } from "./../src/modules/catalog/application/dto/product-card.result.js";
import type { ProductDetailResult } from "./../src/modules/catalog/application/dto/product-detail.result.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { SEARCH_TEXT_MESSAGE } from "./../src/modules/catalog/presentation/http/search-text.js";
import { QUERY_BOOLEAN_MESSAGE } from "./../src/shared/presentation/http/query-boolean.js";
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

  describe("GET /products?q=", () => {
    const titlesOf = (response: request.Response) =>
      (response.body as Page<ProductCardResult>).items.map((card) => card.title);

    it("finds every word of the text in the title, in the store order, cacheable", async () => {
      await shown("Lapicera negra", 0);
      await shown("Lápiz negro HB", 1);
      await shown("Cuaderno rayado", 2);

      const response = await http.get("/api/v1/products").query({ q: " NEGR  la " }).expect(200);

      expect(response.headers["cache-control"]).toBe("public, max-age=60");
      expect(titlesOf(response)).toEqual(["Lapicera negra", "Lápiz negro HB"]);
      expect(response.body).toMatchObject({ totalItems: 2, totalPages: 1 });
    });

    it("combines the text with the category and the page", async () => {
      const other = await insertCategory(pool, "Escolar");
      await shown("Cuaderno A4", 0);
      await shown("Cuaderno A5", 1);
      const { id } = await insertProductWithDeps(pool, {
        title: "Cuaderno escolar",
        categoryId: other,
      });
      await processImage(id, 1);

      const inCategory = await http
        .get("/api/v1/products")
        .query({ q: "cuaderno", categorySlug: "cuadernos", limit: 1, page: 2 })
        .expect(200);

      expect(titlesOf(inCategory)).toEqual(["Cuaderno A5"]);
      expect(inCategory.body).toMatchObject({ totalItems: 2, totalPages: 2 });
    });

    it("takes a blank text as no search, and one-letter words as nothing found", async () => {
      await shown("Cuaderno A4");

      const blank = await http.get("/api/v1/products").query({ q: "   " }).expect(200);
      const letters = await http.get("/api/v1/products").query({ q: "a b" }).expect(200);

      expect(titlesOf(blank)).toEqual(["Cuaderno A4"]);
      expect(letters.body).toMatchObject({ items: [], totalItems: 0 });
    });

    it("refuses a page past the last the store lists", async () => {
      const response = await http.get("/api/v1/products").query({ page: 501 }).expect(400);

      expect((response.body as { code: string }).code).toBe("VALIDATION_FAILED");
    });

    it.each(["a", "a".repeat(101)])("refuses %o with 400", async (q) => {
      const response = await http.get("/api/v1/products").query({ q }).expect(400);

      expect(response.body).toMatchObject({
        code: "VALIDATION_FAILED",
        details: [{ field: "q", messages: [SEARCH_TEXT_MESSAGE] }],
      });
    });
  });

  describe("GET /products/featured and /products/new", () => {
    /** Six products in a known order: by position, then the newest first. */
    async function six(mark: string): Promise<string[]> {
      const ids: string[] = [];
      for (const [title, sortOrder, createdAt] of [
        ["Uno", 0, "2026-10-05"],
        ["Dos", 0, "2026-10-01"],
        ["Tres", 1, "2026-10-09"],
        ["Cuatro", 1, "2026-10-02"],
        ["Cinco", 2, "2026-10-01"],
        ["Seis", 3, "2026-10-01"],
      ] as const) {
        const id = await shown(title, sortOrder);
        await pool.query(`UPDATE libreria.products SET ${mark}, created_at = $2 WHERE id = $1`, [
          id,
          createdAt,
        ]);
        ids.push(id);
      }
      return ids;
    }

    it.each([
      ["featured", "is_featured = true"],
      ["new", "is_new = true"],
    ])("gives five %s products by position and creation date, cacheable", async (route, mark) => {
      const ids = await six(mark);
      // Not marked, so never listed.
      await shown("Sin marca");

      const response = await http.get(`/api/v1/products/${route}`).expect(200);

      expect(response.headers["cache-control"]).toBe("public, max-age=60");
      expect((response.body as ProductCardResult[]).map((card) => card.id)).toEqual(
        ids.slice(0, 5),
      );
    });

    it("leaves out a product whose new mark ended, and hidden ones", async () => {
      const running = await shown("Vigente");
      const ended = await shown("Vencida", 1);
      const inactive = await shown("Inactiva", 2);
      await set(running, "is_new = true, new_until = now() + interval '1 day'");
      await set(ended, "is_new = true, new_until = now() - interval '1 day'");
      await set(inactive, "is_new = true, is_active = false");

      const response = await http.get("/api/v1/products/new").expect(200);

      expect(response.body).toEqual([expect.objectContaining({ id: running, isNew: true })]);
    });

    it("answers an empty list when there are none", async () => {
      await shown("Cuaderno");

      await expect(http.get("/api/v1/products/featured").expect(200)).resolves.toMatchObject({
        body: [],
      });
    });

    it.each([
      ["featured", "is_featured = true", { isFeatured: true }],
      ["new", "is_new = true", { isNew: true }],
    ])(
      "lists every %s product, paged, in the order of the section",
      async (route, mark, filter) => {
        const ids = await six(mark);
        await shown("Sin marca");

        const section = await http.get(`/api/v1/products/${route}`).expect(200);
        const firstPage = await http
          .get("/api/v1/products")
          .query({ ...filter, limit: 5 })
          .expect(200);
        const secondPage = await http
          .get("/api/v1/products")
          .query({ ...filter, limit: 5, page: 2 })
          .expect(200);

        expect(firstPage.headers["cache-control"]).toBe("public, max-age=60");
        expect((firstPage.body as Page<ProductCardResult>).items).toEqual(section.body);
        expect(firstPage.body).toMatchObject({ totalItems: 6, totalPages: 2 });
        expect((secondPage.body as Page<ProductCardResult>).items.map((card) => card.id)).toEqual(
          ids.slice(5),
        );
      },
    );
  });

  describe("GET /products?isFeatured=&isNew=", () => {
    const titlesOf = (response: request.Response) =>
      (response.body as Page<ProductCardResult>).items.map((card) => card.title);

    it("lists only the products whose new mark still runs, or only the others", async () => {
      const running = await shown("Vigente", 0);
      const ended = await shown("Vencida", 1);
      await shown("Sin marca", 2);
      await set(running, "is_new = true, new_until = now() + interval '1 day'");
      await set(ended, "is_new = true, new_until = now() - interval '1 day'");

      const marked = await http.get("/api/v1/products").query({ isNew: true }).expect(200);
      const others = await http.get("/api/v1/products").query({ isNew: false }).expect(200);

      expect(titlesOf(marked)).toEqual(["Vigente"]);
      expect(titlesOf(others)).toEqual(["Vencida", "Sin marca"]);
    });

    it("combines the marks with the text, the category and each other", async () => {
      const other = await insertCategory(pool, "Escolar");
      const both = await shown("Cuaderno A4", 0);
      const featured = await shown("Cuaderno A5", 1);
      await shown("Lapiz HB", 2);
      const { id: elsewhere } = await insertProductWithDeps(pool, {
        title: "Cuaderno escolar",
        categoryId: other,
      });
      await processImage(elsewhere, 1);
      for (const id of [both, featured, elsewhere]) {
        await set(id, "is_featured = true");
      }
      await set(both, "is_new = true");

      const response = await http
        .get("/api/v1/products")
        .query({ q: "cuaderno", categorySlug: "cuadernos", isFeatured: true })
        .expect(200);
      const newAndFeatured = await http
        .get("/api/v1/products")
        .query({ isFeatured: true, isNew: true })
        .expect(200);

      expect(titlesOf(response)).toEqual(["Cuaderno A4", "Cuaderno A5"]);
      expect(response.body).toMatchObject({ totalItems: 2 });
      expect(titlesOf(newAndFeatured)).toEqual(["Cuaderno A4"]);
    });

    it.each([
      ["isFeatured", "si"],
      ["isNew", "1"],
    ])("refuses %s=%s with 400", async (field, value) => {
      const response = await http
        .get("/api/v1/products")
        .query({ [field]: value })
        .expect(400);

      expect(response.body).toMatchObject({
        code: "VALIDATION_FAILED",
        details: [{ field, messages: [QUERY_BOOLEAN_MESSAGE] }],
      });
    });
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

    it("gives the related products set by hand in their order first, then fills up to 4 from its category", async () => {
      const id = await shown("Cuaderno A4");
      const first = await shown("Manual Uno", 3);
      const hidden = await shown("Manual Oculto", 0);
      const second = await shown("Manual Dos", 2);
      const byCategory = [await shown("Misma Uno", 1), await shown("Misma Dos", 4)];
      await shown("Misma Tres", 5);
      await set(hidden, "is_active = false");
      for (const [sortOrder, relatedId] of [first, hidden, second].entries()) {
        await pool.query(
          "INSERT INTO libreria.related_products (product_id, related_product_id, sort_order) VALUES ($1, $2, $3)",
          [id, relatedId, sortOrder],
        );
      }

      const response = await http.get("/api/v1/products/cuaderno-a4").expect(200);

      expect((response.body as ProductDetailResult).relatedProducts.map((card) => card.id)).toEqual(
        [first, second, ...byCategory],
      );
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
