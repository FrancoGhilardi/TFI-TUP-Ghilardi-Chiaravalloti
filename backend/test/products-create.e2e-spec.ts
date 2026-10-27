import type { INestApplication } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { StorageClient } from "@supabase/storage-js";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import { ProductImageUploadedEvent } from "./../src/modules/catalog/application/events/product-image-uploaded.event.js";
import { ProductImageRepository } from "./../src/modules/catalog/domain/repositories/product-image.repository.js";
import { AccessTokenService } from "./../src/modules/identity/application/ports/access-token-service.js";
import { UserRepository } from "./../src/modules/identity/domain/repositories/user.repository.js";
import { BackgroundTasks } from "./../src/shared/application/background-tasks.js";
import { FileStorage, StorageBucket } from "./../src/shared/application/file-storage.js";
import type { LoggingBackgroundTasks } from "./../src/shared/infrastructure/logging-background-tasks.js";
import {
  fetchWithTimeout,
  SupabaseFileStorage,
} from "./../src/shared/infrastructure/storage/supabase-file-storage.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { createTestApp } from "./create-test-app.js";
import {
  adminPool,
  insertCategory,
  insertProductWithDeps,
  insertUser,
  truncateAll,
} from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 1, 2, 3]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
const TEN_MB = 10 * 1024 * 1024;

/** The real Storage, recording what goes up and failing an upload on demand. */
class RecordingStorage extends FileStorage {
  readonly uploaded: string[] = [];
  failOnUpload?: number;
  /** The failing upload reaches Storage first, as one whose answer is lost would. */
  storeBeforeFailing = false;
  failSigning = false;

  constructor(private readonly real: FileStorage) {
    super();
  }

  async upload(bucket: StorageBucket, key: string, body: Uint8Array, contentType: string) {
    if (this.uploaded.length + 1 === this.failOnUpload) {
      if (this.storeBeforeFailing) {
        await this.real.upload(bucket, key, body, contentType);
        this.uploaded.push(key);
      }
      throw new Error("storage down");
    }
    await this.real.upload(bucket, key, body, contentType);
    this.uploaded.push(key);
  }

  remove(bucket: StorageBucket, keys: string[]) {
    return this.real.remove(bucket, keys);
  }

  signedUrls(keys: string[], expiresInSeconds: number) {
    return this.failSigning
      ? Promise.reject(new Error("storage down"))
      : this.real.signedUrls(keys, expiresInSeconds);
  }
}

interface ProductBody {
  id: string;
  sku: string;
  slug: string;
  images: { id: string; previewUrl: string | null; status: string; position: number }[];
}

describe("POST /admin/products (e2e)", () => {
  const real = new SupabaseFileStorage(
    new StorageClient(
      new URL("/storage/v1", process.env.SUPABASE_URL).toString(),
      {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
      },
      fetchWithTimeout,
    ),
  );
  const leftovers: string[] = [];
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let storage: RecordingStorage;
  let token: string;
  let primaryId: string;
  let secondId: string;
  let published: string[];

  beforeAll(() => {
    pool = adminPool();
  });

  async function start(overrides: { provide: unknown; useValue: unknown }[] = []) {
    storage = new RecordingStorage(real);
    app = await createTestApp({
      overrides: [
        { provide: FileStorage, useValue: storage },
        ...(overrides as { provide: typeof FileStorage; useValue: unknown }[]),
      ],
    });
    http = request(app.getHttpServer());
    published = [];
    app
      .get(EventEmitter2)
      .on(ProductImageUploadedEvent.NAME, (event: ProductImageUploadedEvent) =>
        published.push(event.imageId),
      );
    token = await tokenFor(await insertUser(pool, { role: "ADMIN", mustChangePassword: false }));
  }

  // A fresh app per test starts the rate limits at zero.
  beforeEach(async () => {
    await truncateAll(pool);
    primaryId = await insertCategory(pool, "Cuadernos");
    secondId = await insertCategory(pool, "Escolar");
    await start();
  });

  afterEach(async () => {
    await idle();
    leftovers.push(...storage.uploaded);
    await app.close();
  });

  afterAll(async () => {
    await real.remove(StorageBucket.PRIVATE, leftovers);
    await truncateAll(pool);
    await pool.end();
  });

  async function tokenFor(id: string): Promise<string> {
    const user = await app.get(UserRepository, { strict: false }).findById(id);
    if (!user) throw new Error(`User ${id} not found`);
    return app.get(AccessTokenService, { strict: false }).issue(user).token;
  }

  const idle = () => app.get<BackgroundTasks, LoggingBackgroundTasks>(BackgroundTasks).idle();

  const data = (overrides: Record<string, unknown> = {}) => ({
    title: "Cuaderno Rayado A4",
    price: "1500.50",
    isOnSale: false,
    stock: 10,
    isFeatured: false,
    isNew: false,
    isActive: true,
    categoryIds: [primaryId, secondId],
    primaryCategoryId: primaryId,
    ...overrides,
  });

  function post(
    body: unknown = data(),
    files: { content: Buffer; name?: string; type?: string; field?: string }[] = [
      { content: JPEG },
    ],
  ) {
    let pending = http.post("/api/v1/admin/products").set("Authorization", `Bearer ${token}`);
    // null leaves the data field out.
    if (body !== null) {
      pending = pending.field("data", typeof body === "string" ? body : JSON.stringify(body));
    }
    for (const [index, file] of files.entries()) {
      pending = pending.attach(file.field ?? "images", file.content, {
        filename: file.name ?? `image-${index}.jpg`,
        contentType: file.type ?? "image/jpeg",
      });
    }
    return pending;
  }

  const expectError = async (pending: request.Test, statusCode: number, code: string) => {
    const response = await pending.expect(statusCode);
    const body = response.body as ErrorResponse;
    expect(body.code).toBe(code);
    return body;
  };

  const productCount = async () =>
    Number(
      (await pool.query<{ n: string }>("SELECT count(*) AS n FROM libreria.products")).rows[0].n,
    );

  const isStored = async (key: string) => (await real.signedUrls([key], 60))[0] !== null;

  it("creates the product with pending images in the private storage, and the exact shape", async () => {
    const response = await post(data({ description: "Tapa dura", imageAltTexts: [" Tapa "] }), [
      { content: JPEG },
      { content: PNG, name: "dorso.png", type: "image/png" },
    ]).expect(201);

    const body = response.body as ProductBody;
    expect(body).toMatchObject({
      sku: "LMS-000001",
      title: "Cuaderno Rayado A4",
      slug: "cuaderno-rayado-a4",
      description: "Tapa dura",
      price: "1500.50",
      salePrice: null,
      isOnSale: false,
      stock: 10,
      isActive: true,
      primaryCategoryId: primaryId,
      categories: [
        { id: primaryId, name: "Cuadernos", slug: "cuadernos" },
        { id: secondId, name: "Escolar", slug: "escolar" },
      ],
      relatedProducts: [],
      createdBy: { name: "Test user" },
      deletedAt: null,
    });
    expect(body.images.map(({ position, status }) => [position, status])).toEqual([
      [1, "PENDING"],
      [2, "PENDING"],
    ]);
    expect(response.body).toMatchObject({
      images: [
        { altText: "Tapa", mimeType: "image/jpeg", sizeBytes: JPEG.length },
        { altText: null, mimeType: "image/png", sizeBytes: PNG.length },
      ],
    });
    const preview = await fetch(body.images[0].previewUrl ?? "");
    expect(Buffer.from(await preview.arrayBuffer())).toEqual(JPEG);
    expect(storage.uploaded).toEqual([
      `products/${body.id}/${body.images[0].id}.jpg`,
      `products/${body.id}/${body.images[1].id}.png`,
    ]);
    const { rows } = await pool.query<{ original_key: string; status: string }>(
      "SELECT original_key, status FROM libreria.product_images WHERE product_id = $1 ORDER BY position",
      [body.id],
    );
    expect(rows).toEqual(storage.uploaded.map((key) => ({ original_key: key, status: "PENDING" })));
  });

  it("publishes one event per image once created", async () => {
    const response = await post(data(), [
      { content: JPEG },
      { content: PNG, type: "image/png" },
    ]).expect(201);
    await idle();

    expect(published).toEqual((response.body as ProductBody).images.map((image) => image.id));
  });

  it("starts it on sale and new, with the related products once each", async () => {
    const other = await insertProductWithDeps(pool, { categoryId: primaryId });

    const response = await post(
      data({
        isOnSale: true,
        salePrice: "1200",
        saleEndsAt: "2099-01-01T00:00:00.000Z",
        isNew: true,
        isFeatured: true,
        isActive: false,
        sortOrder: 2,
        relatedProductIds: [other.id, other.id],
      }),
    ).expect(201);

    expect(response.body).toMatchObject({
      isOnSale: true,
      salePrice: "1200.00",
      saleEndsAt: "2099-01-01T00:00:00.000Z",
      isNew: true,
      newUntil: null,
      isFeatured: true,
      isActive: false,
      sortOrder: 2,
      relatedProducts: [{ id: other.id }],
    });
  });

  it("answers the created product when its images cannot be signed, without their links", async () => {
    storage.failSigning = true;

    const response = await post().expect(201);

    expect((response.body as ProductBody).images.map((image) => image.previewUrl)).toEqual([null]);
    expect(await productCount()).toBe(1);
  });

  it("gives a repeated title the next free slug", async () => {
    await post().expect(201);

    const response = await post().expect(201);

    expect((response.body as ProductBody).slug).toBe("cuaderno-rayado-a4-2");
  });

  it("takes five images", async () => {
    const response = await post(
      data(),
      Array.from({ length: 5 }, () => ({ content: JPEG })),
    ).expect(201);

    expect((response.body as ProductBody).images).toHaveLength(5);
  });

  describe("categories", () => {
    it.each([
      ["repeated", () => data({ categoryIds: [primaryId, primaryId] })],
      ["without the primary one among them", () => data({ categoryIds: [secondId] })],
      ["empty", () => data({ categoryIds: [] })],
    ])("refuses them %s, uploading nothing", async (_label, body) => {
      await expectError(post(body()), 400, "INVALID_CATEGORY_ASSIGNMENT");

      expect(storage.uploaded).toEqual([]);
      expect(await productCount()).toBe(0);
    });

    it.each([
      ["inactive", "UPDATE libreria.categories SET is_active = false WHERE id = $1"],
      ["deleted", "UPDATE libreria.categories SET deleted_at = now() WHERE id = $1"],
    ])("refuses one that is %s", async (_label, change) => {
      await pool.query(change, [secondId]);

      await expectError(post(), 422, "CATEGORY_UNAVAILABLE");
      expect(storage.uploaded).toEqual([]);
    });
  });

  it("refuses a related product that was deleted", async () => {
    const other = await insertProductWithDeps(pool, { categoryId: primaryId });
    await pool.query("UPDATE libreria.products SET deleted_at = now() WHERE id = $1", [other.id]);

    await expectError(
      post(data({ relatedProductIds: [other.id] })),
      422,
      "RELATED_PRODUCT_UNAVAILABLE",
    );
  });

  describe("when the files cannot be kept", () => {
    it("removes the uploaded ones and saves nothing when an upload fails", async () => {
      storage.failOnUpload = 2;

      await expectError(
        post(data(), [{ content: JPEG }, { content: PNG, type: "image/png" }]),
        502,
        "IMAGE_UPLOAD_FAILED",
      );
      await idle();

      expect(storage.uploaded).toHaveLength(1);
      expect(await isStored(storage.uploaded[0])).toBe(false);
      expect(await productCount()).toBe(0);
    });

    it("removes a file whose upload failed after reaching Storage", async () => {
      storage.failOnUpload = 1;
      storage.storeBeforeFailing = true;

      await expectError(post(), 502, "IMAGE_UPLOAD_FAILED");
      await idle();

      expect(storage.uploaded).toHaveLength(1);
      expect(await isStored(storage.uploaded[0])).toBe(false);
    });

    it("rolls back and removes every file when saving fails", async () => {
      await app.close();
      await start([
        {
          provide: ProductImageRepository,
          useValue: { saveAll: () => Promise.reject(new Error("database down")) },
        },
      ]);

      await expectError(
        post(data(), [{ content: JPEG }, { content: PNG, type: "image/png" }]),
        500,
        "INTERNAL_ERROR",
      );
      await idle();

      expect(storage.uploaded).toHaveLength(2);
      for (const key of storage.uploaded) {
        expect(await isStored(key)).toBe(false);
      }
      expect(await productCount()).toBe(0);
      expect(published).toEqual([]);
    });
  });

  describe("images", () => {
    it.each([
      ["none", []],
      ["six", Array.from({ length: 6 }, () => ({ content: JPEG }))],
      ["one in another field", [{ content: JPEG, field: "photos" }]],
    ])("refuses %s", async (_label, files) => {
      await expectError(post(data(), files), 400, "INVALID_IMAGE_COUNT");

      expect(storage.uploaded).toEqual([]);
    });

    it("refuses a file that is not an image, whatever it claims, naming it", async () => {
      const body = await expectError(
        post(data(), [
          { content: JPEG },
          { content: Buffer.from("not an image"), name: "foto.jpg" },
        ]),
        400,
        "INVALID_IMAGE",
      );

      expect(body.message).toBe("La imagen 2 tiene que ser JPEG, PNG o WebP.");
    });

    it("refuses a file over 10 MB", async () => {
      const heavy = Buffer.concat([JPEG, Buffer.alloc(TEN_MB)]);

      const body = await expectError(post(data(), [{ content: heavy }]), 400, "INVALID_IMAGE");

      expect(body.message).toBe("Las imágenes no pueden pesar más de 10 MB.");
    });

    it("refuses more alt texts than images", async () => {
      const body = await expectError(
        post(data({ imageAltTexts: ["a", "b"] })),
        400,
        "VALIDATION_FAILED",
      );

      expect(body.details).toEqual([
        { field: "imageAltTexts", messages: ["Hay más textos alternativos que imágenes."] },
      ]);
    });
  });

  describe("data", () => {
    it.each([
      ["missing", null, "data"],
      ["not JSON", "{title:", "data"],
      ["a list", "[]", "data"],
    ])("refuses it %s", async (_label, body, field) => {
      const error = await expectError(post(body), 400, "VALIDATION_FAILED");

      expect((error.details as { field: string }[]).map((detail) => detail.field)).toEqual([field]);
    });

    it.each([
      ["a price as a number", { price: 1500.5 }, "price"],
      ["a sale price off sale", { salePrice: "100" }, "salePrice"],
      ["on sale without a sale price", { isOnSale: true }, "salePrice"],
      ["a new mark end without the mark", { newUntil: "2099-01-01T00:00:00Z" }, "newUntil"],
      ["an unknown field", { sku: "LMS-999999" }, "sku"],
      ["a category that is not an id", { categoryIds: ["abc"] }, "categoryIds"],
    ])("refuses %s", async (_label, overrides, field) => {
      const error = await expectError(post(data(overrides)), 400, "VALIDATION_FAILED");

      expect((error.details as { field: string }[]).map((detail) => detail.field)).toEqual([field]);
      expect(storage.uploaded).toEqual([]);
    });

    it.each([
      ["a blank title", { title: "  " }, 400, "VALIDATION_FAILED"],
      ["a price of zero", { price: "0" }, 400, "INVALID_PRICE"],
      [
        "a sale price not lower",
        { isOnSale: true, salePrice: "1500.50" },
        422,
        "SALE_PRICE_NOT_LOWER",
      ],
      [
        "a sale that already ended",
        { isOnSale: true, salePrice: "10", saleEndsAt: "2020-01-01T00:00:00Z" },
        400,
        "INVALID_SALE_END",
      ],
      ["a negative stock", { stock: -1 }, 400, "INVALID_STOCK"],
    ])("refuses %s before uploading", async (_label, overrides, status, code) => {
      await expectError(post(data(overrides)), status, code);

      expect(storage.uploaded).toEqual([]);
    });
  });

  describe("access", () => {
    it("lets a seller create products", async () => {
      token = await tokenFor(await insertUser(pool, { mustChangePassword: false }));

      await post().expect(201);
    });

    it("rejects a request without a token", async () => {
      await expectError(
        http.post("/api/v1/admin/products").field("data", JSON.stringify(data())),
        401,
        "INVALID_ACCESS_TOKEN",
      );
    });
  });
});
