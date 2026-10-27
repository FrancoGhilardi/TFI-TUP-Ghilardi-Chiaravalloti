import type { ConfigService } from "@nestjs/config";
import type { Pool } from "pg";
import type { Env } from "../../src/config/env.js";
import { Category } from "../../src/modules/catalog/domain/entities/category.js";
import { CategoryNameInUseError } from "../../src/modules/catalog/domain/errors/category-name-in-use-error.js";
import { DrizzleCategoryRepository } from "../../src/modules/catalog/infrastructure/persistence/drizzle-category.repository.js";
import { DrizzleProductRepository } from "../../src/modules/catalog/infrastructure/persistence/drizzle-product.repository.js";
import { Slug } from "../../src/shared/domain/value-objects/slug.js";
import { DrizzleClient } from "../../src/shared/infrastructure/database/drizzle.client.js";
import { DrizzleExecutor } from "../../src/shared/infrastructure/database/drizzle.executor.js";
import { DrizzleTransactionManager } from "../../src/shared/infrastructure/database/drizzle-transaction-manager.js";
import { adminPool, insertProductWithDeps, truncateAll } from "./db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const NEW_ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000a1";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";
const NOW = new Date("2026-10-22T12:00:00.000Z");

interface Row {
  name: string;
  parentId?: string;
  isActive?: boolean;
  deleted?: boolean;
  slug?: string;
}

describe("DrizzleCategoryRepository (e2e)", () => {
  let pool: Pool;
  let client: DrizzleClient;
  let repository: DrizzleCategoryRepository;
  let transactions: DrizzleTransactionManager;
  let products: DrizzleProductRepository;

  beforeAll(() => {
    pool = adminPool();
    // Runs with the runtime role, so it also checks that role can use the tables.
    const values: Record<string, unknown> = {
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_SSL_MODE: process.env.DATABASE_SSL_MODE ?? "disable",
      DATABASE_SSL_CA: process.env.DATABASE_SSL_CA,
      DATABASE_POOL_MAX: 3,
    };
    client = new DrizzleClient({ get: (key: string) => values[key] } as ConfigService<Env, true>);
    const executor = new DrizzleExecutor(client);
    repository = new DrizzleCategoryRepository(executor);
    products = new DrizzleProductRepository(executor);
    transactions = new DrizzleTransactionManager(client, executor);
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
      `INSERT INTO libreria.categories (parent_id, name, slug, description, sort_order, is_active, deleted_at)
       VALUES ($1, $2, $3, 'Rayados', 2, $4, $5) RETURNING id`,
      [
        row.parentId ?? null,
        row.name,
        row.slug ?? row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        row.isActive ?? true,
        row.deleted ? new Date() : null,
      ],
    );
    return rows[0].id;
  }

  const newCategory = (name = "Cuadernos", parentId?: string) =>
    Category.create({ id: NEW_ID, name, slug: Slug.fromText(name), parentId, now: NOW });

  describe("findById", () => {
    it("rebuilds every field of a category", async () => {
      const parentId = await insert({ name: "Escritura" });
      const id = await insert({ name: "Cuadernos", parentId, isActive: false, deleted: true });

      const category = await repository.findById(id);

      expect(category).toMatchObject({
        parentId,
        name: "Cuadernos",
        description: "Rayados",
        sortOrder: 2,
        active: false,
      });
      expect(category?.slug.toString()).toBe("cuadernos");
      expect(category?.deletedAt).toBeInstanceOf(Date);
      expect(category?.createdAt).toBeInstanceOf(Date);
    });

    it("returns null for an id that does not exist", async () => {
      await expect(repository.findById(UNKNOWN_ID)).resolves.toBeNull();
    });

    it("keeps the row locked until the transaction ends", async () => {
      const id = await insert({ name: "Cuadernos" });
      let markRead: () => void = () => undefined;
      const read = new Promise<void>((resolve) => {
        markRead = resolve;
      });
      const events: string[] = [];

      const edit = transactions.run(async () => {
        const category = await repository.findById(id);
        markRead();
        await new Promise((resolve) => setTimeout(resolve, 300));
        category?.rename("Cuadernos y blocks");
        await repository.save(category!);
        events.push("edit saved");
      });
      await read;
      // A deletion meanwhile waits for the edit, and the edit does not undo it.
      const deletion = pool
        .query("UPDATE libreria.categories SET deleted_at = now() WHERE id = $1", [id])
        .then(() => events.push("deleted"));
      await Promise.all([edit, deletion]);

      expect(events).toEqual(["edit saved", "deleted"]);
      const stored = await repository.findById(id);
      expect(stored?.name).toBe("Cuadernos y blocks");
      expect(stored?.isDeleted()).toBe(true);
    });
  });

  describe("save", () => {
    it("stores a new category that reads back the same", async () => {
      const parentId = await insert({ name: "Escritura" });
      const category = newCategory("Cuadernos", parentId);
      category.describe("Rayados y lisos");
      category.deactivate();

      await repository.save(category);

      expect(await repository.findById(NEW_ID)).toMatchObject({
        parentId,
        name: "Cuadernos",
        description: "Rayados y lisos",
        sortOrder: 0,
        active: false,
        createdAt: NOW,
        deletedAt: undefined,
      });
    });

    it("stores the changes of an existing category, keeping when it was created", async () => {
      await repository.save(newCategory());
      const category = (await repository.findById(NEW_ID))!;
      category.rename("Cuadernos y blocks");
      category.describe(undefined);
      category.changeSortOrder(5);
      category.softDelete(new Date());

      await repository.save(category);

      const stored = await repository.findById(NEW_ID);
      expect(stored).toMatchObject({
        name: "Cuadernos y blocks",
        description: undefined,
        sortOrder: 5,
        createdAt: NOW,
      });
      expect(stored?.slug.toString()).toBe("cuadernos");
      expect(stored?.isDeleted()).toBe(true);
      expect(stored?.updatedAt.getTime()).toBeGreaterThan(NOW.getTime());
    });

    it("reports a second current category with the same name as the name being in use", async () => {
      await insert({ name: "cuadernos", slug: "otro" });

      await expect(repository.save(newCategory("Cuadernos"))).rejects.toThrow(
        CategoryNameInUseError,
      );
    });

    it("stores a name a deleted category has", async () => {
      await insert({ name: "Cuadernos", slug: "otro", deleted: true });

      await expect(repository.save(newCategory("Cuadernos"))).resolves.toBeUndefined();
    });
  });

  describe("existsByName", () => {
    it("is true for a current category with the name, ignoring case", async () => {
      await insert({ name: "Cuadernos" });

      await expect(repository.existsByName("CUADERNOS")).resolves.toBe(true);
    });

    it("ignores the given category and the deleted ones", async () => {
      const id = await insert({ name: "Cuadernos" });
      await insert({ name: "Lápices", slug: "lapices", deleted: true });

      await expect(repository.existsByName("cuadernos", id)).resolves.toBe(false);
      await expect(repository.existsByName("lápices")).resolves.toBe(false);
    });
  });

  describe("existsBySlug", () => {
    it("counts every category, also the deleted ones", async () => {
      await insert({ name: "Cuadernos", deleted: true });

      await expect(repository.existsBySlug(Slug.fromValue("cuadernos"))).resolves.toBe(true);
      await expect(repository.existsBySlug(Slug.fromValue("lapices"))).resolves.toBe(false);
    });
  });

  describe("findAncestorIds", () => {
    it("lists the categories above, from the parent up to the root", async () => {
      const root = await insert({ name: "Escritura" });
      const middle = await insert({ name: "Cuadernos", parentId: root });
      const leaf = await insert({ name: "Rayados", parentId: middle });

      await expect(repository.findAncestorIds(leaf)).resolves.toEqual([middle, root]);
      await expect(repository.findAncestorIds(root)).resolves.toEqual([]);
    });

    it("ends on a loop left in the data", async () => {
      const first = await insert({ name: "Primera" });
      const second = await insert({ name: "Segunda", parentId: first });
      await pool.query("UPDATE libreria.categories SET parent_id = $1 WHERE id = $2", [
        second,
        first,
      ]);

      const ancestors = await repository.findAncestorIds(first);

      expect(ancestors).toEqual([second, first]);
    });
  });

  describe("countCurrentChildren", () => {
    it("counts the direct subcategories not deleted, active or not", async () => {
      const root = await insert({ name: "Escritura" });
      const child = await insert({ name: "Cuadernos", parentId: root });
      await insert({ name: "Lápices", parentId: root, isActive: false });
      await insert({ name: "Gomas", parentId: root, deleted: true });
      await insert({ name: "Rayados", parentId: child });

      await expect(repository.countCurrentChildren(root)).resolves.toBe(2);
    });
  });

  describe("countProductsWhereOnlyCategory", () => {
    it("counts the current products left without another current category", async () => {
      const only = await insert({ name: "Cuadernos" });
      const other = await insert({ name: "Escolar" });
      const gone = await insert({ name: "Viejos" });
      await insertProductWithDeps(pool, { categoryId: only });
      const withOther = await insertProductWithDeps(pool, { categoryId: only });
      const withDeletedOther = await insertProductWithDeps(pool, { categoryId: only });
      const deletedProduct = await insertProductWithDeps(pool, { categoryId: only });
      await pool.query(
        `INSERT INTO libreria.product_categories (product_id, category_id) VALUES ($1, $2), ($3, $4)`,
        [withOther.id, other, withDeletedOther.id, gone],
      );
      await pool.query("UPDATE libreria.categories SET deleted_at = now() WHERE id = $1", [gone]);
      await pool.query("UPDATE libreria.products SET deleted_at = now() WHERE id = $1", [
        deletedProduct.id,
      ]);

      await expect(repository.countProductsWhereOnlyCategory(only)).resolves.toBe(2);
      await expect(repository.countProductsWhereOnlyCategory(other)).resolves.toBe(0);
    });
  });

  describe("findVisibleByIds", () => {
    it("returns the active, current ones among the ids", async () => {
      const visible = await insert({ name: "Cuadernos" });
      const inactive = await insert({ name: "Lápices", isActive: false });
      const deleted = await insert({ name: "Gomas", deleted: true });

      const found = await repository.findVisibleByIds([visible, inactive, deleted, UNKNOWN_ID]);

      expect(found.map((category) => category.getId())).toEqual([visible]);
      await expect(repository.findVisibleByIds([])).resolves.toEqual([]);
    });
  });

  describe("findCurrentIds", () => {
    it("returns the ids of the current ones, active or not", async () => {
      const visible = await insert({ name: "Cuadernos" });
      const inactive = await insert({ name: "Lápices", isActive: false });
      const deleted = await insert({ name: "Gomas", deleted: true });

      const found = await repository.findCurrentIds([visible, inactive, deleted, UNKNOWN_ID]);

      expect(found.sort()).toEqual([visible, inactive].sort());
      await expect(repository.findCurrentIds([])).resolves.toEqual([]);
    });
  });

  describe("lockHierarchy", () => {
    it("makes a second transaction wait until the first ends", async () => {
      const events: string[] = [];
      let markLocked: () => void = () => undefined;
      const locked = new Promise<void>((resolve) => {
        markLocked = resolve;
      });

      const first = transactions.run(async () => {
        await repository.lockHierarchy();
        markLocked();
        await new Promise((resolve) => setTimeout(resolve, 300));
        events.push("first done");
      });
      await locked;
      const second = transactions.run(async () => {
        await repository.lockHierarchy();
        events.push("second locked");
      });
      await Promise.all([first, second]);

      expect(events).toEqual(["first done", "second locked"]);
    });

    it("refuses to run outside a transaction", async () => {
      await expect(repository.lockHierarchy()).rejects.toThrow(/transaction/);
    });
  });

  describe("lockSlug", () => {
    it("makes a transaction locking the same slug wait, and not one locking another", async () => {
      const events: string[] = [];
      let markLocked: () => void = () => undefined;
      const locked = new Promise<void>((resolve) => {
        markLocked = resolve;
      });
      const lockIn = (slug: string, name: string) =>
        transactions.run(async () => {
          await repository.lockSlug(Slug.fromValue(slug));
          events.push(name);
        });

      const first = transactions.run(async () => {
        await repository.lockSlug(Slug.fromValue("cuadernos"));
        markLocked();
        await new Promise((resolve) => setTimeout(resolve, 300));
        events.push("first done");
      });
      await locked;
      const same = lockIn("cuadernos", "same slug locked");
      await lockIn("lapices", "other slug locked");
      await Promise.all([first, same]);

      expect(events).toEqual(["other slug locked", "first done", "same slug locked"]);
    });

    it("never waits for the hierarchy lock nor for a product slug with the same text", async () => {
      let markLocked: () => void = () => undefined;
      const locked = new Promise<void>((resolve) => {
        markLocked = resolve;
      });
      let release: () => void = () => undefined;
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      const holder = transactions.run(async () => {
        await repository.lockHierarchy();
        await products.lockSlug(Slug.fromValue("cuadernos"));
        markLocked();
        await released;
      });
      await locked;

      const free = await Promise.race([
        transactions.run(() => repository.lockSlug(Slug.fromValue("cuadernos"))).then(() => "free"),
        new Promise((resolve) => setTimeout(() => resolve("waited"), 500)),
      ]);
      release();
      await holder;

      expect(free).toBe("free");
    });

    it("refuses to run outside a transaction", async () => {
      await expect(repository.lockSlug(Slug.fromValue("cuadernos"))).rejects.toThrow(/transaction/);
    });
  });
});
