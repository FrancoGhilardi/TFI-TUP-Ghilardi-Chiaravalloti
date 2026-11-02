import type { ConfigService } from "@nestjs/config";
import type { Pool } from "pg";
import type { Env } from "../../src/config/env.js";
import {
  CategorySortField,
  type ListAdminCategoriesQuery,
} from "../../src/modules/catalog/application/dto/list-admin-categories.query.js";
import { DrizzleCategoryQueries } from "../../src/modules/catalog/infrastructure/persistence/drizzle-category.queries.js";
import { RecordStatusFilter, SortDirection } from "../../src/shared/application/pagination.js";
import { DrizzleClient } from "../../src/shared/infrastructure/database/drizzle.client.js";
import { DrizzleExecutor } from "../../src/shared/infrastructure/database/drizzle.executor.js";
import { adminPool, insertProductWithDeps, truncateAll } from "./db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

interface Row {
  name: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
  deleted?: boolean;
  slug?: string;
}

describe("DrizzleCategoryQueries admin listing (e2e)", () => {
  let pool: Pool;
  let client: DrizzleClient;
  let queries: DrizzleCategoryQueries;

  beforeAll(() => {
    pool = adminPool();
    const values: Record<string, unknown> = {
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_SSL_MODE: process.env.DATABASE_SSL_MODE ?? "disable",
      DATABASE_SSL_CA: process.env.DATABASE_SSL_CA,
      DATABASE_POOL_MAX: 2,
    };
    client = new DrizzleClient({ get: (key: string) => values[key] } as ConfigService<Env, true>);
    queries = new DrizzleCategoryQueries(new DrizzleExecutor(client));
  });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await truncateAll(pool);
    await client.onApplicationShutdown();
    await pool.end();
  });

  async function insert(row: Row): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO libreria.categories (parent_id, name, slug, sort_order, is_active, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        row.parentId ?? null,
        row.name,
        row.slug ??
          row.name
            .normalize("NFD")
            .replace(/\p{M}/gu, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-"),
        row.sortOrder ?? 0,
        row.isActive ?? true,
        row.deleted ? new Date() : null,
      ],
    );
    return rows[0].id;
  }

  const page = (query: Partial<ListAdminCategoriesQuery> = {}) =>
    queries.findAdminPage({ page: 1, limit: 20, sortDir: SortDirection.ASC, ...query });

  const names = async (query: Partial<ListAdminCategoriesQuery> = {}) =>
    (await page(query)).items.map((item) => `${"-".repeat(item.depth)}${item.name}`);

  describe("findAdminById", () => {
    it("gives every field, with its parent, depth and current products", async () => {
      const root = await insert({ name: "Escritura" });
      const id = await insert({ name: "Cuadernos", parentId: root, sortOrder: 3 });
      await insertProductWithDeps(pool, { categoryId: id });
      const gone = await insertProductWithDeps(pool, { categoryId: id });
      await pool.query("UPDATE libreria.products SET deleted_at = now() WHERE id = $1", [gone.id]);

      const result = await queries.findAdminById(id);

      expect(result).toEqual({
        id,
        name: "Cuadernos",
        slug: "cuadernos",
        description: null,
        parent: { id: root, name: "Escritura", slug: "escritura" },
        sortOrder: 3,
        isActive: true,
        depth: 1,
        productCount: 1,
        createdAt: expect.any(Date) as Date,
        updatedAt: expect.any(Date) as Date,
        deletedAt: null,
      });
    });

    it("gives a deleted category, and null for an unknown id", async () => {
      const id = await insert({ name: "Cuadernos", deleted: true });

      expect((await queries.findAdminById(id))?.deletedAt).toBeInstanceOf(Date);
      await expect(
        queries.findAdminById("00000000-0000-4000-8000-000000000000"),
      ).resolves.toBeNull();
    });
    it("gives a category in a loop left in the data, without hanging", async () => {
      const first = await insert({ name: "Primera" });
      const second = await insert({ name: "Segunda", parentId: first });
      await pool.query("UPDATE libreria.categories SET parent_id = $1 WHERE id = $2", [
        second,
        first,
      ]);

      expect((await queries.findAdminById(first))?.parent?.id).toBe(second);
    });

    it("counts the depth of a category from its root", async () => {
      const root = await insert({ name: "Escritura" });
      const middle = await insert({ name: "Cuadernos", parentId: root });
      const leaf = await insert({ name: "Rayados", parentId: middle });

      expect((await queries.findAdminById(root))?.depth).toBe(0);
      expect((await queries.findAdminById(leaf))?.depth).toBe(2);
    });
  });

  describe("findAdminPage", () => {
    it("follows the tree by default: each parent before its subcategories, by position and name", async () => {
      const writing = await insert({ name: "Escritura", sortOrder: 1 });
      const school = await insert({ name: "Escolar", sortOrder: 0 });
      await insert({ name: "lápices", parentId: writing });
      const notebooks = await insert({ name: "Cuadernos", parentId: writing });
      await insert({ name: "Rayados", parentId: notebooks });
      await insert({ name: "Ábacos", parentId: school });

      await expect(names()).resolves.toEqual([
        "Escolar",
        "-Ábacos",
        "Escritura",
        "-Cuadernos",
        "--Rayados",
        "-lápices",
      ]);
    });

    it("keeps the tree order and depth when filtering by status", async () => {
      const writing = await insert({ name: "Escritura" });
      await insert({ name: "Cuadernos", parentId: writing, deleted: true });
      await insert({ name: "Lápices", parentId: writing, isActive: false });

      await expect(names()).resolves.toEqual(["Escritura", "-Lápices"]);
      await expect(names({ status: RecordStatusFilter.DELETED })).resolves.toEqual(["-Cuadernos"]);
      await expect(names({ status: RecordStatusFilter.INACTIVE })).resolves.toEqual(["-Lápices"]);
      await expect(names({ status: RecordStatusFilter.ACTIVE })).resolves.toEqual(["Escritura"]);
      await expect(names({ status: RecordStatusFilter.ALL })).resolves.toEqual([
        "Escritura",
        "-Cuadernos",
        "-Lápices",
      ]);
    });

    it("searches the name or the slug, ignoring case and accents, in a flat list by name", async () => {
      const root = await insert({ name: "Útiles" });
      await insert({ name: "Lapices de colores", parentId: root });
      await insert({ name: "Gomas", slug: "borradores" });
      await insert({ name: "Cuadernos" });

      await expect(names({ q: "UTIL" })).resolves.toEqual(["Útiles"]);
      await expect(names({ q: "lápi" })).resolves.toEqual(["-Lapices de colores"]);
      await expect(names({ q: "borrad" })).resolves.toEqual(["Gomas"]);
    });

    it("takes the wildcards of the search as text", async () => {
      await insert({ name: "Ofertas 50%", slug: "ofertas-50" });
      await insert({ name: "Ofertas 500", slug: "ofertas-500" });

      await expect(names({ q: "50%" })).resolves.toEqual(["Ofertas 50%"]);
    });

    it("lists the direct subcategories of a parent, by name", async () => {
      const root = await insert({ name: "Escritura" });
      const child = await insert({ name: "Lápices", parentId: root, sortOrder: 0 });
      await insert({ name: "Cuadernos", parentId: root, sortOrder: 9 });
      await insert({ name: "Negros", parentId: child });

      await expect(names({ parentId: root })).resolves.toEqual(["-Cuadernos", "-Lápices"]);
    });

    it("sorts by the field asked, with the name breaking ties", async () => {
      await insert({ name: "Cuadernos", sortOrder: 1 });
      await insert({ name: "Blocks", sortOrder: 1 });
      await insert({ name: "Agendas", sortOrder: 0 });

      await expect(
        names({ sortBy: CategorySortField.SORT_ORDER, sortDir: SortDirection.DESC }),
      ).resolves.toEqual(["Blocks", "Cuadernos", "Agendas"]);
      await expect(
        names({ sortBy: CategorySortField.NAME, sortDir: SortDirection.DESC }),
      ).resolves.toEqual(["Cuadernos", "Blocks", "Agendas"]);
    });

    it("pages the results with their totals", async () => {
      for (const name of ["A", "B", "C", "D", "E"]) {
        await insert({ name });
      }

      const second = await page({ page: 2, limit: 2 });

      expect(second.items.map((item) => item.name)).toEqual(["C", "D"]);
      expect(second).toMatchObject({ page: 2, limit: 2, totalItems: 5, totalPages: 3 });
      expect((await page({ page: 4, limit: 2 })).totalItems).toBe(5);
    });

    it("leaves out a loop left in the data, without hanging", async () => {
      await insert({ name: "Escritura" });
      const first = await insert({ name: "Primera" });
      const second = await insert({ name: "Segunda", parentId: first });
      await pool.query("UPDATE libreria.categories SET parent_id = $1 WHERE id = $2", [
        second,
        first,
      ]);

      await expect(names()).resolves.toEqual(["Escritura"]);
    });
  });
});
