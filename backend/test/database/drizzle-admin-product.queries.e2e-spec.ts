import type { ConfigService } from "@nestjs/config";
import type { Pool } from "pg";
import type { Env } from "../../src/config/env.js";
import {
  AdminProductSortField,
  type ListAdminProductsQuery,
} from "../../src/modules/catalog/application/dto/list-admin-products.query.js";
import { ImageSettings } from "../../src/modules/catalog/application/settings/image-settings.js";
import { DrizzleAdminProductQueries } from "../../src/modules/catalog/infrastructure/persistence/drizzle-admin-product.queries.js";
import { FileStorage } from "../../src/shared/application/file-storage.js";
import { RecordStatusFilter, SortDirection } from "../../src/shared/application/pagination.js";
import { DrizzleClient } from "../../src/shared/infrastructure/database/drizzle.client.js";
import { DrizzleExecutor } from "../../src/shared/infrastructure/database/drizzle.executor.js";
import { adminPool, insertCategory, insertProductWithDeps, truncateAll } from "./db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const NOW = new Date("2026-10-28T12:00:00.000Z");
const UNKNOWN_ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000ff";

/** Builds addresses without calling Storage, and fails to sign on demand. */
class FakeStorage extends FileStorage {
  failSigning = false;
  readonly signed: string[][] = [];

  upload(): Promise<void> {
    return Promise.reject(new Error("Not used"));
  }

  remove(): Promise<void> {
    return Promise.reject(new Error("Not used"));
  }

  download(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  signedUrls(keys: string[]): Promise<(string | null)[]> {
    this.signed.push(keys);
    return this.failSigning
      ? Promise.reject(new Error("storage down"))
      : Promise.resolve(keys.map((key) => `signed://${key}`));
  }

  publicUrl(key: string): string {
    return `public://${key}`;
  }
}

describe("DrizzleAdminProductQueries.findPage (e2e)", () => {
  let pool: Pool;
  let client: DrizzleClient;
  let storage: FakeStorage;
  let queries: DrizzleAdminProductQueries;
  let categoryId: string;

  beforeAll(() => {
    pool = adminPool();
    const values: Record<string, unknown> = {
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_SSL_MODE: process.env.DATABASE_SSL_MODE ?? "disable",
      DATABASE_SSL_CA: process.env.DATABASE_SSL_CA,
      DATABASE_POOL_MAX: 3,
    };
    client = new DrizzleClient({ get: (key: string) => values[key] } as ConfigService<Env, true>);
    storage = new FakeStorage();
    queries = new DrizzleAdminProductQueries(
      new DrizzleExecutor(client),
      storage,
      new ImageSettings(),
    );
  });

  beforeEach(async () => {
    await truncateAll(pool);
    storage.failSigning = false;
    storage.signed.length = 0;
    categoryId = await insertCategory(pool, "Cuadernos");
  });

  afterAll(async () => {
    await truncateAll(pool);
    await client.onApplicationShutdown();
    await pool.end();
  });

  /** A product updated at `updatedAt`, so the default order is known. */
  async function product(
    title: string,
    changes: Record<string, unknown> = {},
    category = categoryId,
  ): Promise<string> {
    const { id } = await insertProductWithDeps(pool, { title, categoryId: category });
    const columns = { updated_at: new Date("2026-10-01T00:00:00Z"), ...changes };
    const assignments = Object.keys(columns).map((column, index) => `${column} = $${index + 2}`);
    // The trigger stamps updated_at on every update; set it back afterwards.
    await pool.query("ALTER TABLE libreria.products DISABLE TRIGGER trg_products_set_updated_at");
    try {
      await pool.query(`UPDATE libreria.products SET ${assignments.join(", ")} WHERE id = $1`, [
        id,
        ...Object.values(columns),
      ]);
    } finally {
      await pool.query("ALTER TABLE libreria.products ENABLE TRIGGER trg_products_set_updated_at");
    }
    return id;
  }

  const page = (query: Partial<ListAdminProductsQuery> = {}) =>
    queries.findPage({ page: 1, limit: 20, ...query }, NOW);

  const titles = async (query: Partial<ListAdminProductsQuery> = {}) =>
    (await page(query)).items.map((item) => item.title);

  it("gives each row with its primary category, its running marks and amounts as text", async () => {
    const id = await product("Cuaderno A4", {
      price: "1500.50",
      is_on_sale: true,
      sale_price: "1200.00",
      is_featured: true,
      stock: 7,
    });

    const result = await page();

    expect(result).toMatchObject({ page: 1, limit: 20, totalItems: 1, totalPages: 1 });
    expect(result.items).toEqual([
      {
        id,
        sku: expect.stringMatching(/^LMS-\d{6,}$/) as unknown,
        title: "Cuaderno A4",
        slug: "cuaderno-a4",
        price: "1500.50",
        salePrice: "1200.00",
        stock: 7,
        isActive: true,
        isFeatured: true,
        isNew: false,
        isOnSale: true,
        primaryCategory: { id: categoryId, name: "Cuadernos", slug: "cuadernos" },
        thumbnail: expect.objectContaining({
          url: expect.stringMatching(/^signed:\/\//) as unknown,
        }) as unknown,
        updatedAt: new Date("2026-10-01T00:00:00Z"),
        deletedAt: null,
      },
    ]);
  });

  it("lists the products not deleted by default, and each status on its own", async () => {
    await product("Activo");
    await product("Inactivo", { is_active: false });
    await product("Borrado", { deleted_at: new Date("2026-10-20T00:00:00Z") });
    const sorted = { sortBy: AdminProductSortField.TITLE };

    await expect(titles(sorted)).resolves.toEqual(["Activo", "Inactivo"]);
    await expect(titles({ ...sorted, status: RecordStatusFilter.ACTIVE })).resolves.toEqual([
      "Activo",
    ]);
    await expect(titles({ ...sorted, status: RecordStatusFilter.INACTIVE })).resolves.toEqual([
      "Inactivo",
    ]);
    await expect(titles({ ...sorted, status: RecordStatusFilter.DELETED })).resolves.toEqual([
      "Borrado",
    ]);
    await expect(titles({ ...sorted, status: RecordStatusFilter.ALL })).resolves.toEqual([
      "Activo",
      "Borrado",
      "Inactivo",
    ]);
  });

  it("searches the title ignoring case and accents, or the SKU, taking the wildcards as text", async () => {
    await product("Lápiz negro");
    await product("Cuaderno 50% off");
    await product("Cuaderno 500");
    const [{ sku }] = (await page({ q: "500" })).items;

    await expect(titles({ q: "LAPIZ" })).resolves.toEqual(["Lápiz negro"]);
    await expect(titles({ q: "50%" })).resolves.toEqual(["Cuaderno 50% off"]);
    await expect(titles({ q: sku.toLowerCase() })).resolves.toEqual(["Cuaderno 500"]);
  });

  it("filters by a category assigned in any role, and by every current one below it", async () => {
    const child = await insertCategory(pool, "Rayados");
    await pool.query("UPDATE libreria.categories SET parent_id = $2 WHERE id = $1", [
      child,
      categoryId,
    ]);
    const gone = await insertCategory(pool, "Viejos");
    await pool.query(
      "UPDATE libreria.categories SET parent_id = $2, deleted_at = now() WHERE id = $1",
      [gone, categoryId],
    );
    const other = await insertCategory(pool, "Lapices");
    await product("En la categoria");
    await product("En la subcategoria", {}, child);
    await product("Bajo una dada de baja", {}, gone);
    const secondary = await product("Como secundaria", {}, other);
    await pool.query(
      "INSERT INTO libreria.product_categories (product_id, category_id, is_primary) VALUES ($1, $2, false)",
      [secondary, categoryId],
    );
    await product("En otra", {}, other);
    const sorted = { sortBy: AdminProductSortField.TITLE };

    await expect(titles({ ...sorted, categoryId })).resolves.toEqual([
      "Como secundaria",
      "En la categoria",
      "En la subcategoria",
    ]);
    await expect(titles({ categoryId: UNKNOWN_ID })).resolves.toEqual([]);
  });

  it("counts a sale or a new mark only while it runs, in the filters and in the row", async () => {
    await product("Oferta vigente", {
      is_on_sale: true,
      sale_price: "5.00",
      sale_ends_at: new Date("2026-11-01T00:00:00Z"),
    });
    await product("Oferta vencida", {
      is_on_sale: true,
      sale_price: "5.00",
      sale_ends_at: new Date("2026-10-01T00:00:00Z"),
    });
    await product("Nuevo vigente", { is_new: true });
    await product("Nuevo vencido", { is_new: true, new_until: new Date("2026-10-28T12:00:00Z") });
    await product("Destacado", { is_featured: true });
    const sorted = { sortBy: AdminProductSortField.TITLE };

    await expect(titles({ ...sorted, isOnSale: true })).resolves.toEqual(["Oferta vigente"]);
    await expect(titles({ ...sorted, isNew: true })).resolves.toEqual(["Nuevo vigente"]);
    await expect(titles({ ...sorted, isFeatured: true })).resolves.toEqual(["Destacado"]);
    await expect(titles({ ...sorted, isOnSale: false, isNew: false })).resolves.toEqual([
      "Destacado",
      "Nuevo vencido",
      "Oferta vencida",
    ]);
    const ended = (await page({ q: "Oferta vencida" })).items[0];
    expect(ended).toMatchObject({ isOnSale: false, salePrice: null });
  });

  it("filters the products with little stock", async () => {
    await product("Sin stock", { stock: 0 });
    await product("Poco", { stock: 3 });
    await product("Mucho", { stock: 50 });

    await expect(titles({ maxStock: 3, sortBy: AdminProductSortField.STOCK })).resolves.toEqual([
      "Sin stock",
      "Poco",
    ]);
  });

  it("lists the last changed first by default, breaking ties by title and id", async () => {
    await product("Viejo", { updated_at: new Date("2026-09-01T00:00:00Z") });
    await product("Nuevo B", { updated_at: new Date("2026-10-20T00:00:00Z") });
    await product("Nuevo a", { updated_at: new Date("2026-10-20T00:00:00Z") });

    await expect(titles()).resolves.toEqual(["Nuevo a", "Nuevo B", "Viejo"]);
    // The direction asked is kept even for the default field, and a field chosen alone goes up.
    await expect(titles({ sortDir: SortDirection.ASC })).resolves.toEqual([
      "Viejo",
      "Nuevo a",
      "Nuevo B",
    ]);
    await expect(titles({ sortBy: AdminProductSortField.UPDATED_AT })).resolves.toEqual([
      "Viejo",
      "Nuevo a",
      "Nuevo B",
    ]);
  });

  it("sorts the SKUs by their number, also past six digits", async () => {
    const longer = await product("Siete digitos");
    await product("Seis digitos");
    await pool.query(
      "ALTER TABLE libreria.products DISABLE TRIGGER trg_products_prevent_sku_update",
    );
    try {
      await pool.query("UPDATE libreria.products SET sku = 'LMS-1000000' WHERE id = $1", [longer]);
      await pool.query("UPDATE libreria.products SET sku = 'LMS-200000' WHERE id <> $1", [longer]);
    } finally {
      await pool.query(
        "ALTER TABLE libreria.products ENABLE TRIGGER trg_products_prevent_sku_update",
      );
    }

    await expect(titles({ sortBy: AdminProductSortField.SKU })).resolves.toEqual([
      "Seis digitos",
      "Siete digitos",
    ]);
    await expect(
      titles({ sortBy: AdminProductSortField.SKU, sortDir: SortDirection.DESC }),
    ).resolves.toEqual(["Siete digitos", "Seis digitos"]);
  });

  // Titles that start without an accent: the test helper builds the slug from the title.
  it.each([
    [AdminProductSortField.TITLE, SortDirection.ASC, ["beta", "Lápiz", "Lapo"]],
    [AdminProductSortField.PRICE, SortDirection.DESC, ["Lápiz", "Lapo", "beta"]],
    [AdminProductSortField.STOCK, SortDirection.ASC, ["beta", "Lapo", "Lápiz"]],
    [AdminProductSortField.CREATED_AT, SortDirection.DESC, ["beta", "Lapo", "Lápiz"]],
    [AdminProductSortField.SKU, SortDirection.ASC, ["Lapo", "Lápiz", "beta"]],
  ])(
    "sorts by %s %s, ignoring case and accents in the title",
    async (sortBy, sortDir, expected) => {
      await product("Lapo", { price: "200.00", stock: 5, created_at: new Date("2026-01-02") });
      await product("Lápiz", { price: "900.00", stock: 9, created_at: new Date("2026-01-01") });
      await product("beta", { price: "50.00", stock: 1, created_at: new Date("2026-01-03") });

      await expect(titles({ sortBy, sortDir })).resolves.toEqual(expected);
    },
  );

  it("breaks ties of a column by title and id", async () => {
    await product("Beta", { stock: 2 });
    await product("alfa", { stock: 2 });
    await product("Gama", { stock: 1 });

    await expect(
      titles({ sortBy: AdminProductSortField.STOCK, sortDir: SortDirection.DESC }),
    ).resolves.toEqual(["alfa", "Beta", "Gama"]);
  });

  it("pages the results with their total, also past the last page", async () => {
    for (const title of ["A", "B", "C", "D", "E"]) {
      await product(title);
    }

    const second = await page({ page: 2, limit: 2, sortBy: AdminProductSortField.TITLE });

    expect(second.items.map((item) => item.title)).toEqual(["C", "D"]);
    expect(second).toMatchObject({ totalItems: 5, totalPages: 3 });
    await expect(page({ page: 4, limit: 2 })).resolves.toMatchObject({
      items: [],
      totalItems: 5,
    });
  });

  it("shows the public version of the first image, or a link to its original, signed in one call", async () => {
    const processed = await product("Procesado");
    await pool.query(
      "UPDATE libreria.product_images SET status = 'PROCESSED', public_key = 'products/p.webp' WHERE product_id = $1",
      [processed],
    );
    await product("Pendiente");
    await product("Otro pendiente");

    const { items } = await page({ sortBy: AdminProductSortField.TITLE });

    expect(items.map((item) => item.thumbnail?.url)).toEqual([
      expect.stringMatching(/^signed:\/\/original\//),
      expect.stringMatching(/^signed:\/\/original\//),
      "public://products/p.webp",
    ]);
    expect(storage.signed).toHaveLength(1);
    expect(storage.signed[0]).toHaveLength(2);
  });

  it("still gives the page, without the links, when the storage cannot sign them", async () => {
    await product("Pendiente");
    storage.failSigning = true;

    const { items } = await page();

    expect(items[0].thumbnail).toMatchObject({ url: null });
  });
});
