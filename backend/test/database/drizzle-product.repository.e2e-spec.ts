import type { ConfigService } from "@nestjs/config";
import type { Pool } from "pg";
import type { Env } from "../../src/config/env.js";
import { ImageSettings } from "../../src/modules/catalog/application/settings/image-settings.js";
import { Product } from "../../src/modules/catalog/domain/entities/product.js";
import { ProductImage } from "../../src/modules/catalog/domain/entities/product-image.js";
import { ImageStatus } from "../../src/modules/catalog/domain/image-status.js";
import { CategoryAssignment } from "../../src/modules/catalog/domain/value-objects/category-assignment.js";
import { DrizzleAdminProductQueries } from "../../src/modules/catalog/infrastructure/persistence/drizzle-admin-product.queries.js";
import { DrizzleCategoryRepository } from "../../src/modules/catalog/infrastructure/persistence/drizzle-category.repository.js";
import { DrizzleProductImageRepository } from "../../src/modules/catalog/infrastructure/persistence/drizzle-product-image.repository.js";
import { DrizzleProductRepository } from "../../src/modules/catalog/infrastructure/persistence/drizzle-product.repository.js";
import { DrizzleSkuGenerator } from "../../src/modules/catalog/infrastructure/persistence/drizzle-sku.generator.js";
import { FileStorage } from "../../src/shared/application/file-storage.js";
import {
  slugStoreOf,
  UniqueSlugGenerator,
} from "../../src/shared/application/unique-slug-generator.js";
import { Money } from "../../src/shared/domain/value-objects/money.js";
import { Slug } from "../../src/shared/domain/value-objects/slug.js";
import { DrizzleClient } from "../../src/shared/infrastructure/database/drizzle.client.js";
import { DrizzleExecutor } from "../../src/shared/infrastructure/database/drizzle.executor.js";
import { DrizzleTransactionManager } from "../../src/shared/infrastructure/database/drizzle-transaction-manager.js";
import {
  adminPool,
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

const PRODUCT_ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000b1";
const OTHER_ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000b2";
const IMAGE_ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000c1";
const NOW = new Date("2026-10-22T12:00:00.000Z");
const LATER = new Date("2099-01-01T00:00:00.000Z");

/** Signs nothing for real: the queries only need some link per original. */
class LinkingStorage extends FileStorage {
  upload(): Promise<void> {
    return Promise.reject(new Error("Not used"));
  }
  remove(): Promise<void> {
    return Promise.reject(new Error("Not used"));
  }
  failing = false;

  signedUrls(keys: string[], expiresInSeconds: number): Promise<(string | null)[]> {
    if (this.failing) {
      return Promise.reject(new Error("storage down"));
    }
    return Promise.resolve(keys.map((key) => `signed://${key}?ttl=${expiresInSeconds}`));
  }

  publicUrl(key: string): string {
    return `public://${key}`;
  }

  download(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

describe("Product persistence (e2e)", () => {
  let pool: Pool;
  let client: DrizzleClient;
  let products: DrizzleProductRepository;
  let images: DrizzleProductImageRepository;
  let categories: DrizzleCategoryRepository;
  let skus: DrizzleSkuGenerator;
  let queries: DrizzleAdminProductQueries;
  let linking: LinkingStorage;
  let transactions: DrizzleTransactionManager;
  let actorId: string;
  let primaryId: string;
  let secondId: string;

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
    products = new DrizzleProductRepository(executor);
    images = new DrizzleProductImageRepository(executor);
    categories = new DrizzleCategoryRepository(executor);
    skus = new DrizzleSkuGenerator(executor);
    linking = new LinkingStorage();
    queries = new DrizzleAdminProductQueries(executor, linking, new ImageSettings());
    transactions = new DrizzleTransactionManager(client, executor);
  });

  beforeEach(async () => {
    await truncateAll(pool);
    actorId = await insertUser(pool, { mustChangePassword: false });
    primaryId = await insertCategory(pool, "Cuadernos");
    secondId = await insertCategory(pool, "Escolar");
  });

  afterAll(async () => {
    await truncateAll(pool);
    await client.onApplicationShutdown();
    await pool.end();
  });

  async function newProduct(id = PRODUCT_ID, title = "Cuaderno A4"): Promise<Product> {
    return Product.create({
      id,
      sku: await skus.next(),
      title,
      slug: Slug.fromText(title),
      price: Money.fromDecimal("1500.50"),
      stock: 3,
      categories: CategoryAssignment.fromIds([primaryId, secondId], primaryId),
      createdBy: actorId,
      now: NOW,
    });
  }

  const imageOf = (productId: string, id = IMAGE_ID) =>
    ProductImage.register({
      id,
      productId,
      position: 1,
      originalKey: `products/${productId}/${id}.jpg`,
      altText: "Tapa",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
      now: NOW,
    });

  async function store(product: Product): Promise<void> {
    await transactions.run(async () => {
      await products.save(product);
      await images.saveAll([imageOf(product.getId(), product.getId().replace("b", "c"))]);
    });
  }

  it("gives two creations at once with the same title different slugs", async () => {
    const generator = new UniqueSlugGenerator();
    const slugStore = slugStoreOf(products);
    let markPicked: () => void = () => undefined;
    const picked = new Promise<void>((resolve) => {
      markPicked = resolve;
    });

    const create = (id: string, afterPicking: () => Promise<void>) =>
      transactions.run(async () => {
        const slug = await generator.generate("Cuaderno A4", slugStore, Slug.MAX_LENGTH);
        await afterPicking();
        const product = Product.create({
          id,
          sku: await skus.next(),
          title: "Cuaderno A4",
          slug,
          price: Money.fromDecimal("10"),
          categories: CategoryAssignment.fromIds([primaryId], primaryId),
          createdBy: actorId,
          now: NOW,
        });
        await products.save(product);
        await images.saveAll([imageOf(id, id.replace("b", "c"))]);
        return slug.toString();
      });

    // The first one saves a while after picking its slug, while the second one picks.
    const first = create(PRODUCT_ID, async () => {
      markPicked();
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    await picked;
    const second = create(OTHER_ID, () => Promise.resolve());

    await expect(Promise.all([first, second])).resolves.toEqual(["cuaderno-a4", "cuaderno-a4-2"]);
  });

  it("refuses to lock a slug outside a transaction", async () => {
    await expect(products.lockSlug(Slug.fromValue("cuaderno"))).rejects.toThrow(/transaction/);
  });

  it("generates consecutive SKUs from the sequence", async () => {
    const first = await skus.next();
    const second = await skus.next();

    expect(first.toString()).toBe("LMS-000001");
    expect(second.toString()).toBe("LMS-000002");
  });

  it("stores a product with its categories, related products and image, read back the same", async () => {
    await store(await newProduct(OTHER_ID, "Lapicera"));
    const product = await newProduct();
    product.startSale(Money.fromDecimal("999.99"), LATER, NOW);
    product.markAsNew(LATER, NOW);
    product.setFeatured(true);
    product.setRelatedProducts([OTHER_ID]);
    product.deactivate();

    await store(product);

    const stored = await products.findById(PRODUCT_ID);
    expect(stored).toMatchObject({
      title: "Cuaderno A4",
      stock: 3,
      onSale: true,
      saleEndsAt: LATER,
      featured: true,
      isNewFlag: true,
      newUntil: LATER,
      active: false,
      relatedProductIds: [OTHER_ID],
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: NOW,
    });
    expect(stored?.price.toDecimalString()).toBe("1500.50");
    expect(stored?.salePrice?.toDecimalString()).toBe("999.99");
    // The other product took the first SKU.
    expect(stored?.sku.toString()).toBe("LMS-000002");
    expect(stored?.getPrimaryCategoryId()).toBe(primaryId);
    expect(stored?.categories.map((assignment) => assignment.categoryId).sort()).toEqual(
      [primaryId, secondId].sort(),
    );
  });

  it("lets the database refuse a product without an image at commit", async () => {
    const product = await newProduct();

    await expect(transactions.run(() => products.save(product))).rejects.toMatchObject({
      cause: expect.objectContaining({ code: "23514" }) as unknown,
    });
    await expect(products.findById(PRODUCT_ID)).resolves.toBeNull();
  });

  it("finds the slugs of every product and only the current ids", async () => {
    await store(await newProduct());
    await store(await newProduct(OTHER_ID, "Lapicera"));
    await pool.query("UPDATE libreria.products SET deleted_at = now() WHERE id = $1", [OTHER_ID]);

    await expect(products.existsBySlug(Slug.fromValue("lapicera"))).resolves.toBe(true);
    await expect(products.existsBySlug(Slug.fromValue("goma"))).resolves.toBe(false);
    await expect(products.findExistingIds([PRODUCT_ID, OTHER_ID])).resolves.toEqual([PRODUCT_ID]);
    await expect(products.findExistingIds([])).resolves.toEqual([]);
  });

  it("gives the panel the whole product, with names, links and amounts as text", async () => {
    const product = await newProduct();
    product.startSale(Money.fromDecimal("999"), undefined, NOW);
    await store(product);

    const result = await queries.findById(PRODUCT_ID);

    expect(result).toEqual({
      id: PRODUCT_ID,
      sku: "LMS-000001",
      title: "Cuaderno A4",
      slug: "cuaderno-a4",
      description: null,
      price: "1500.50",
      salePrice: "999.00",
      isOnSale: true,
      saleEndsAt: null,
      stock: 3,
      isFeatured: false,
      isNew: false,
      newUntil: null,
      sortOrder: 0,
      isActive: true,
      primaryCategoryId: primaryId,
      categories: [
        { id: primaryId, name: "Cuadernos", slug: "cuadernos" },
        { id: secondId, name: "Escolar", slug: "escolar" },
      ],
      images: [
        {
          id: PRODUCT_ID.replace("b", "c"),
          position: 1,
          previewUrl: `signed://products/${PRODUCT_ID}/${PRODUCT_ID.replace("b", "c")}.jpg?ttl=600`,
          altText: "Tapa",
          mimeType: "image/jpeg",
          sizeBytes: 2048,
          status: ImageStatus.PENDING,
          createdAt: NOW,
        },
      ],
      relatedProducts: [],
      createdBy: { id: actorId, name: "Test user" },
      updatedBy: { id: actorId, name: "Test user" },
      createdAt: NOW,
      updatedAt: expect.any(Date) as Date,
      deletedAt: null,
    });
    await expect(queries.findById(OTHER_ID)).resolves.toBeNull();
  });

  it("still gives the product, without links, when the storage cannot sign them", async () => {
    await store(await newProduct());
    linking.failing = true;

    const result = await queries.findById(PRODUCT_ID);
    linking.failing = false;

    expect(result?.images.map((image) => image.previewUrl)).toEqual([null]);
  });

  it("counts the images of each product and gives one image as the panel shows it", async () => {
    await store(await newProduct());
    await store(await newProduct(OTHER_ID, "Cuaderno A5"));
    await images.saveAll([
      ProductImage.register({
        id: "4f9c1f43-6f4b-4d5c-9a3e-0000000000c9",
        productId: PRODUCT_ID,
        position: 2,
        originalKey: `products/${PRODUCT_ID}/second.png`,
        mimeType: "image/png",
        sizeBytes: 4096,
        now: NOW,
      }),
    ]);

    await expect(images.countByProduct(PRODUCT_ID)).resolves.toBe(2);
    await expect(images.countByProduct(OTHER_ID)).resolves.toBe(1);
    await expect(images.countByProduct("4f9c1f43-6f4b-4d5c-9a3e-0000000000ff")).resolves.toBe(0);
    await expect(queries.findImageById("4f9c1f43-6f4b-4d5c-9a3e-0000000000c9")).resolves.toEqual({
      id: "4f9c1f43-6f4b-4d5c-9a3e-0000000000c9",
      position: 2,
      previewUrl: `signed://products/${PRODUCT_ID}/second.png?ttl=600`,
      altText: null,
      mimeType: "image/png",
      sizeBytes: 4096,
      status: "PENDING",
      createdAt: expect.any(Date) as unknown,
    });
    await expect(queries.findImageById("4f9c1f43-6f4b-4d5c-9a3e-0000000000ff")).resolves.toBeNull();
  });

  it("finds an image by its id, locked inside a transaction, and stores it processed", async () => {
    await store(await newProduct());
    const imageId = PRODUCT_ID.replace("b", "c");

    await expect(images.findById("4f9c1f43-6f4b-4d5c-9a3e-0000000000ff")).resolves.toBeNull();
    await transactions.run(async () => {
      const image = (await images.findById(imageId))!;
      expect(image).toMatchObject({ productId: PRODUCT_ID, status: ImageStatus.PENDING });
      await expect(
        pool.query("SELECT id FROM libreria.product_images WHERE id = $1 FOR UPDATE NOWAIT", [
          imageId,
        ]),
      ).rejects.toMatchObject({ code: "55P03" });
      image.markProcessed({
        publicKey: `products/${PRODUCT_ID}/v1.webp`,
        width: 1200,
        height: 1500,
      });
      await images.saveAll([image]);
    });

    await expect(images.findById(imageId)).resolves.toMatchObject({
      status: ImageStatus.PROCESSED,
      publicKey: `products/${PRODUCT_ID}/v1.webp`,
      width: 1200,
      height: 1500,
    });
  });

  it("gives a product's images by position, locked, and saves a swap of positions at once", async () => {
    await store(await newProduct());
    const first = PRODUCT_ID.replace("b", "c");
    const second = "4f9c1f43-6f4b-4d5c-9a3e-0000000000c9";
    await images.saveAll([
      ProductImage.register({
        id: second,
        productId: PRODUCT_ID,
        position: 2,
        originalKey: `products/${PRODUCT_ID}/second.png`,
        mimeType: "image/png",
        sizeBytes: 4096,
        now: NOW,
      }),
    ]);

    await transactions.run(async () => {
      const found = await images.findByProduct(PRODUCT_ID);
      expect(found.map((image) => image.getId())).toEqual([first, second]);
      await expect(
        pool.query("SELECT id FROM libreria.product_images WHERE id = $1 FOR UPDATE NOWAIT", [
          second,
        ]),
      ).rejects.toMatchObject({ code: "55P03" });
      found[0].moveTo(2);
      found[1].moveTo(1);
      await images.saveAll(found);
    });

    await expect(
      images.findByProduct(PRODUCT_ID).then((found) => found.map((image) => image.getId())),
    ).resolves.toEqual([second, first]);
    await expect(
      queries.findImagesByProduct(PRODUCT_ID).then((found) => found?.map((image) => image.id)),
    ).resolves.toEqual([second, first]);
    await expect(images.findByProduct(OTHER_ID)).resolves.toEqual([]);
    // An unknown product is told apart from one without images.
    await expect(queries.findImagesByProduct(OTHER_ID)).resolves.toBeNull();
  });

  it("removes an image and numbers the others again in one transaction", async () => {
    await store(await newProduct());
    const first = PRODUCT_ID.replace("b", "c");
    const others = ["4f9c1f43-6f4b-4d5c-9a3e-0000000000c8", "4f9c1f43-6f4b-4d5c-9a3e-0000000000c9"];
    await images.saveAll(
      others.map((id, index) =>
        ProductImage.register({
          id,
          productId: PRODUCT_ID,
          position: index + 2,
          originalKey: `products/${PRODUCT_ID}/${id}.png`,
          mimeType: "image/png",
          sizeBytes: 4096,
          now: NOW,
        }),
      ),
    );

    await transactions.run(async () => {
      await images.delete(first);
      const left = await images.findByProduct(PRODUCT_ID);
      left.forEach((image, index) => image.moveTo(index + 1));
      await images.saveAll(left);
    });

    const left = await images.findByProduct(PRODUCT_ID);
    expect(left.map((image) => [image.getId(), image.position])).toEqual([
      [others[0], 1],
      [others[1], 2],
    ]);
    await expect(images.findById(first)).resolves.toBeNull();
    await expect(images.delete(first)).resolves.toBeUndefined();
  });

  it("gives the image without its link when the storage cannot sign it", async () => {
    await store(await newProduct());
    // The id `store` gives the product's image.
    const imageId = PRODUCT_ID.replace("b", "c");
    linking.failing = true;
    try {
      await expect(queries.findImageById(imageId)).resolves.toMatchObject({
        id: imageId,
        previewUrl: null,
      });
    } finally {
      linking.failing = false;
    }
  });

  it("makes a category deletion wait for a transaction that reads it as visible", async () => {
    const events: string[] = [];
    let markRead: () => void = () => undefined;
    const read = new Promise<void>((resolve) => {
      markRead = resolve;
    });

    const creation = transactions.run(async () => {
      await categories.findVisibleByIds([primaryId]);
      markRead();
      await new Promise((resolve) => setTimeout(resolve, 300));
      events.push("creation done");
    });
    await read;
    const deletion = pool
      .query("SELECT id FROM libreria.categories WHERE id = $1 FOR UPDATE", [primaryId])
      .then(() => events.push("deletion locked"));
    await Promise.all([creation, deletion]);

    expect(events).toEqual(["creation done", "deletion locked"]);
  });

  it("makes a category deletion wait for a transaction that reads it as current", async () => {
    await pool.query("UPDATE libreria.categories SET is_active = false WHERE id = $1", [primaryId]);
    const events: string[] = [];
    let markRead: () => void = () => undefined;
    const read = new Promise<void>((resolve) => {
      markRead = resolve;
    });

    const restore = transactions.run(async () => {
      await expect(categories.findCurrentIds([primaryId])).resolves.toEqual([primaryId]);
      markRead();
      await new Promise((resolve) => setTimeout(resolve, 300));
      events.push("restore done");
    });
    await read;
    const deletion = pool
      .query("SELECT id FROM libreria.categories WHERE id = $1 FOR UPDATE", [primaryId])
      .then(() => events.push("deletion locked"));
    await Promise.all([restore, deletion]);

    expect(events).toEqual(["restore done", "deletion locked"]);
  });

  it("saves a product without waiting for a related product locked elsewhere, if they did not change", async () => {
    await store(await newProduct(OTHER_ID, "Lapicera"));
    const product = await newProduct();
    product.setRelatedProducts([OTHER_ID]);
    await store(product);
    const other = await pool.connect();
    try {
      // As a deletion of the related product would hold it.
      await other.query("BEGIN");
      await other.query("SELECT id FROM libreria.products WHERE id = $1 FOR UPDATE", [OTHER_ID]);

      const saved = transactions.run(async () => {
        const found = (await products.findById(PRODUCT_ID))!;
        found.setStock(9);
        await products.save(found);
        return "saved";
      });
      const winner = await Promise.race([
        saved,
        new Promise((resolve) => setTimeout(() => resolve("waited"), 500)),
      ]);
      await other.query("COMMIT");
      await saved;

      expect(winner).toBe("saved");
      await expect(products.findById(PRODUCT_ID)).resolves.toMatchObject({
        stock: 9,
        relatedProductIds: [OTHER_ID],
      });
    } finally {
      other.release();
    }
  });

  it("never writes another slug or SKU over the stored ones, whatever the copy saved holds", async () => {
    await store(await newProduct());
    // The same id with another title, slug and SKU (LMS-000002).
    const altered = await newProduct(PRODUCT_ID, "Otro Cuaderno");

    await transactions.run(() => products.save(altered));

    const stored = await products.findById(PRODUCT_ID);
    expect(stored?.title).toBe("Otro Cuaderno");
    expect(stored?.slug.toString()).toBe("cuaderno-a4");
    expect(stored?.sku.toString()).toBe("LMS-000001");
  });

  it("keeps the slug and the SKU on later saves, and stores the deletion and its author", async () => {
    await store(await newProduct());
    await transactions.run(async () => {
      const found = (await products.findById(PRODUCT_ID))!;
      found.changeTitle("Cuaderno Rayado");
      found.softDelete(actorId, LATER);
      await products.save(found);
    });

    const stored = await products.findById(PRODUCT_ID);
    expect(stored).toMatchObject({
      title: "Cuaderno Rayado",
      deletedAt: LATER,
      updatedBy: actorId,
    });
    expect(stored?.slug.toString()).toBe("cuaderno-a4");
    expect(stored?.sku.toString()).toBe("LMS-000001");
  });

  describe("clearing ended sales and new marks", () => {
    interface Marks {
      [column: string]: unknown;
      is_on_sale: boolean;
      sale_price: string | null;
      sale_ends_at: Date | null;
      is_new: boolean;
      new_until: Date | null;
      updated_by: string | null;
      updated_at: Date;
    }

    /** A product on sale and marked as new, both ending at `endsAt` (text keeps microseconds). */
    async function marked(title: string, endsAt: string | null, active = true): Promise<string> {
      const { id } = await insertProductWithDeps(pool, { title, categoryId: primaryId });
      await pool.query(
        `UPDATE libreria.products
         SET is_on_sale = true, sale_price = '5.00', sale_ends_at = $2::timestamptz,
           is_new = true, new_until = $2::timestamptz, updated_by = $3, is_active = $4
         WHERE id = $1`,
        [id, endsAt, actorId, active],
      );
      return id;
    }

    async function marksOf(id: string): Promise<Marks> {
      const { rows } = await pool.query<Marks>(
        `SELECT is_on_sale, sale_price, sale_ends_at, is_new, new_until, updated_by, updated_at
         FROM libreria.products WHERE id = $1`,
        [id],
      );
      return rows[0];
    }

    const CLEARED = {
      is_on_sale: false,
      sale_price: null,
      sale_ends_at: null,
      is_new: false,
      new_until: null,
    };

    it("ends those that ended by now, also on inactive and deleted products, keeping the author", async () => {
      const ended = await marked("Vencido", "2026-10-22T11:00:00.000Z");
      const inactive = await marked("Inactivo", "2026-10-01T00:00:00.000Z", false);
      const deleted = await marked("Borrado", "2026-10-21T00:00:00.000Z");
      await pool.query("UPDATE libreria.products SET deleted_at = now() WHERE id = $1", [deleted]);
      const running = await marked("Vigente", "2026-10-22T13:00:00.000Z");
      const open = await marked("Sin vencimiento", null);

      await expect(products.clearExpiredMarks(NOW)).resolves.toEqual({ sales: 3, newMarks: 3 });

      for (const id of [ended, inactive, deleted]) {
        await expect(marksOf(id)).resolves.toMatchObject({ ...CLEARED, updated_by: actorId });
      }
      await expect(marksOf(running)).resolves.toMatchObject({
        is_on_sale: true,
        sale_price: "5.00",
        sale_ends_at: new Date("2026-10-22T13:00:00.000Z"),
        is_new: true,
        new_until: new Date("2026-10-22T13:00:00.000Z"),
      });
      await expect(marksOf(open)).resolves.toMatchObject({
        is_on_sale: true,
        sale_ends_at: null,
        is_new: true,
        new_until: null,
      });
    });

    it("ends only what ended on each product, counting only what was still on", async () => {
      const saleEnded = await marked("Oferta vencida", "2026-10-22T11:00:00.000Z");
      await pool.query(
        "UPDATE libreria.products SET new_until = '2026-10-22T13:00:00.000Z' WHERE id = $1",
        [saleEnded],
      );
      const leftover = await marked("Restos", "2026-10-22T11:00:00.000Z");
      await pool.query(
        "UPDATE libreria.products SET is_on_sale = false, is_new = false WHERE id = $1",
        [leftover],
      );

      await expect(products.clearExpiredMarks(NOW)).resolves.toEqual({ sales: 1, newMarks: 0 });

      await expect(marksOf(saleEnded)).resolves.toMatchObject({
        is_on_sale: false,
        sale_price: null,
        is_new: true,
        new_until: new Date("2026-10-22T13:00:00.000Z"),
      });
      await expect(marksOf(leftover)).resolves.toMatchObject({
        sale_ends_at: new Date("2026-10-22T11:00:00.000Z"),
        new_until: new Date("2026-10-22T11:00:00.000Z"),
      });
    });

    it("takes an end at now, or within its millisecond, as ended, like the store does", async () => {
      const atNow = await marked("Justo ahora", "2026-10-22T12:00:00.000Z");
      const sameMillisecond = await marked("Mismo milisegundo", "2026-10-22T12:00:00.000500Z");
      const nextMillisecond = await marked("Un milisegundo despues", "2026-10-22T12:00:00.001Z");

      await products.clearExpiredMarks(NOW);

      await expect(marksOf(atNow)).resolves.toMatchObject(CLEARED);
      await expect(marksOf(sameMillisecond)).resolves.toMatchObject(CLEARED);
      await expect(marksOf(nextMillisecond)).resolves.toMatchObject({
        is_on_sale: true,
        is_new: true,
      });
    });

    it("waits for an edit holding the product and keeps the sale it set", async () => {
      const id = await marked("En edicion", "2026-10-22T11:00:00.000Z");
      const editing = await pool.connect();
      try {
        await editing.query("BEGIN");
        await editing.query("SELECT id FROM libreria.products WHERE id = $1 FOR UPDATE", [id]);
        await editing.query(
          `UPDATE libreria.products
           SET sale_ends_at = '2026-10-30T00:00:00.000Z', new_until = NULL WHERE id = $1`,
          [id],
        );

        const cleanup = products.clearExpiredMarks(NOW);
        await vi.waitFor(async () => {
          const { rows } = await pool.query<{ waiting: number }>(
            `SELECT count(*)::int AS waiting FROM pg_stat_activity
             WHERE wait_event_type = 'Lock' AND query LIKE '%WITH ended AS%'`,
          );
          expect(rows[0].waiting).toBe(1);
        });
        await editing.query("COMMIT");

        await expect(cleanup).resolves.toEqual({ sales: 0, newMarks: 0 });
      } finally {
        editing.release();
      }
      await expect(marksOf(id)).resolves.toMatchObject({
        is_on_sale: true,
        sale_ends_at: new Date("2026-10-30T00:00:00.000Z"),
        is_new: true,
        new_until: null,
      });
    });

    it("changes nothing when run again", async () => {
      const ended = await marked("Vencido", "2026-10-22T11:00:00.000Z");
      await products.clearExpiredMarks(NOW);
      const before = await marksOf(ended);

      await expect(products.clearExpiredMarks(NOW)).resolves.toEqual({ sales: 0, newMarks: 0 });

      await expect(marksOf(ended)).resolves.toEqual(before);
    });
  });
});
