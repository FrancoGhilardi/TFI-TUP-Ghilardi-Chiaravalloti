import type { INestApplication } from "@nestjs/common";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { GlobalSearchResult } from "./../src/modules/catalog/application/dto/global-search.result.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { createTestApp } from "./create-test-app.js";
import {
  adminPool,
  insertCategory,
  insertProductWithDeps,
  truncateAll,
} from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

describe("GET /search (e2e)", () => {
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

  /** A product with its image processed, as the store needs it. */
  async function shown(title: string, sortOrder = 0): Promise<string> {
    const { id } = await insertProductWithDeps(pool, { title, categoryId });
    await pool.query(
      `UPDATE libreria.product_images
       SET status = 'PROCESSED', public_key = 'products/' || product_id || '/' || id || '.webp'
       WHERE product_id = $1`,
      [id],
    );
    await pool.query("UPDATE libreria.products SET sort_order = $2 WHERE id = $1", [id, sortOrder]);
    return id;
  }

  const search = (query: Record<string, unknown>) => http.get("/api/v1/search").query(query);

  it("gives the visible products and categories that match, to anyone and cacheable", async () => {
    const notebook = await shown("Cuaderno rayado");
    const hidden = await shown("Cuaderno oculto");
    await pool.query("UPDATE libreria.products SET is_active = false WHERE id = $1", [hidden]);
    await shown("Lápiz negro");

    const response = await search({ q: " cuaderno " }).expect(200);

    expect(response.headers["cache-control"]).toBe("public, max-age=60");
    const body = response.body as GlobalSearchResult;
    expect(body.products.map((card) => card.id)).toEqual([notebook]);
    expect(body.products[0]).toMatchObject({
      slug: "cuaderno-rayado",
      price: "10.00",
      category: { id: categoryId, name: "Cuadernos", slug: "cuadernos" },
    });
    expect(body.categories).toEqual([{ id: categoryId, name: "Cuadernos", slug: "cuadernos" }]);
  });

  it("finds every word in any order, ignoring case and accents", async () => {
    const pencil = await shown("Lápiz negro HB");
    await shown("Lápiz rojo");

    const response = await search({ q: "NEGRO lapiz" }).expect(200);

    expect((response.body as GlobalSearchResult).products.map((card) => card.id)).toEqual([pencil]);
  });

  it("brings 5 of each by default, and up to the limit asked", async () => {
    for (let index = 0; index < 7; index++) {
      await shown(`Cuaderno ${index}`, index);
      await insertCategory(pool, `Cuadernos ${index}`);
    }

    const byDefault = (await search({ q: "cuaderno" }).expect(200)).body as GlobalSearchResult;
    const asked = (await search({ q: "cuaderno", limit: 2 }).expect(200))
      .body as GlobalSearchResult;

    expect(byDefault.products).toHaveLength(5);
    expect(byDefault.categories).toHaveLength(5);
    expect(asked.products.map((card) => card.title)).toEqual(["Cuaderno 0", "Cuaderno 1"]);
    expect(asked.categories.map((category) => category.name)).toEqual(["Cuadernos", "Cuadernos 0"]);
  });

  it.each(["mochila", "c a"])("answers both groups empty when nothing matches %o", async (q) => {
    await shown("Cuaderno rayado");

    const response = await search({ q }).expect(200);

    expect(response.body).toEqual({ products: [], categories: [] });
  });

  it.each([
    [{}],
    [{ q: "a" }],
    [{ q: "  a  " }],
    [{ q: "a".repeat(101) }],
    [{ q: "cuaderno", limit: 0 }],
    [{ q: "cuaderno", limit: 11 }],
    [{ q: "cuaderno", page: 2 }],
  ])("refuses %o with 400, without caching it", async (query) => {
    const response = await search(query).expect(400);

    expect((response.body as ErrorResponse).code).toBe("VALIDATION_FAILED");
    expect(response.headers["cache-control"]).toBe("no-store");
  });
});
