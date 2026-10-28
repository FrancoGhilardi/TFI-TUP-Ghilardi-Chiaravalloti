import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { AdminProductImageResult } from "./../src/modules/catalog/application/dto/admin-product-detail.result.js";
import { ProductImageUploadedEvent } from "./../src/modules/catalog/application/events/product-image-uploaded.event.js";
import { ProcessProductImageUseCase } from "./../src/modules/catalog/application/use-cases/process-product-image.use-case.js";
import { AccessTokenService } from "./../src/modules/identity/application/ports/access-token-service.js";
import { UserRepository } from "./../src/modules/identity/domain/repositories/user.repository.js";
import { BackgroundTasks } from "./../src/shared/application/background-tasks.js";
import { FileStorage, StorageBucket } from "./../src/shared/application/file-storage.js";
import type { LoggingBackgroundTasks } from "./../src/shared/infrastructure/logging-background-tasks.js";
import {
  createStorageClient,
  SupabaseFileStorage,
} from "./../src/shared/infrastructure/storage/supabase-file-storage.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { createTestApp } from "./create-test-app.js";
import {
  adminPool,
  insertCategory,
  insertImage,
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
const GIF = Buffer.from("GIF89a-not-an-accepted-format");
const TEN_MB = 10 * 1024 * 1024;

/** The real Storage, recording what goes up and failing uploads on demand. */
class RecordingStorage extends FileStorage {
  readonly uploaded: string[] = [];
  failUploads = false;

  constructor(private readonly real: FileStorage) {
    super();
  }

  async upload(bucket: StorageBucket, key: string, body: Uint8Array, contentType: string) {
    if (this.failUploads) {
      throw new Error("storage down");
    }
    await this.real.upload(bucket, key, body, contentType);
    this.uploaded.push(key);
  }

  remove(bucket: StorageBucket, keys: string[]) {
    return this.real.remove(bucket, keys);
  }

  download(bucket: StorageBucket, key: string) {
    return this.real.download(bucket, key);
  }

  signedUrls(keys: string[], expiresInSeconds: number) {
    return this.real.signedUrls(keys, expiresInSeconds);
  }

  publicUrl(key: string) {
    return this.real.publicUrl(key);
  }
}

describe("POST /admin/products/:productId/images (e2e)", () => {
  const real = new SupabaseFileStorage(
    createStorageClient(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    ),
  );
  const leftovers: string[] = [];
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let storage: RecordingStorage;
  let token: string;
  let productId: string;
  let published: string[];

  beforeAll(() => {
    pool = adminPool();
  });

  // A fresh app per test starts the rate limits at zero.
  beforeEach(async () => {
    await truncateAll(pool);
    storage = new RecordingStorage(real);
    app = await createTestApp({
      overrides: [
        { provide: FileStorage, useValue: storage },
        // The images stay pending: their processing is tested on its own.
        { provide: ProcessProductImageUseCase, useValue: { execute: () => Promise.resolve() } },
      ],
    });
    http = request(app.getHttpServer());
    published = [];
    app
      .get(EventEmitter2)
      .on(ProductImageUploadedEvent.NAME, (event: ProductImageUploadedEvent) =>
        published.push(event.imageId),
      );
    token = await tokenFor("ADMIN");
    const categoryId = await insertCategory(pool, "Cuadernos");
    productId = (await insertProductWithDeps(pool, { title: "Cuaderno A4", categoryId })).id;
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

  async function tokenFor(role: "ADMIN" | "SELLER"): Promise<string> {
    const id = await insertUser(pool, { role, mustChangePassword: false });
    const user = await app.get(UserRepository, { strict: false }).findById(id);
    if (!user) throw new Error(`User ${id} not found`);
    return app.get(AccessTokenService, { strict: false }).issue(user).token;
  }

  const idle = () => app.get<BackgroundTasks, LoggingBackgroundTasks>(BackgroundTasks).idle();

  function upload(
    options: {
      id?: string;
      files?: { content: Buffer; type?: string; field?: string }[];
      altText?: string;
      auth?: string | null;
    } = {},
  ) {
    let pending = http.post(`/api/v1/admin/products/${options.id ?? productId}/images`);
    const auth = options.auth === undefined ? token : options.auth;
    if (auth !== null) {
      pending = pending.set("Authorization", `Bearer ${auth}`);
    }
    if (options.altText !== undefined) {
      pending = pending.field("altText", options.altText);
    }
    for (const file of options.files ?? [{ content: JPEG }]) {
      pending = pending.attach(file.field ?? "image", file.content, {
        filename: "image.jpg",
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

  const imageRows = async () =>
    (
      await pool.query<{ id: string; position: number; status: string; original_key: string }>(
        `SELECT id, position, status, original_key FROM libreria.product_images
         WHERE product_id = $1 ORDER BY position`,
        [productId],
      )
    ).rows;

  async function addStoredImages(count: number): Promise<void> {
    const positions = (await imageRows()).length;
    for (let index = 1; index <= count; index++) {
      await insertImage(pool, productId, positions + index);
    }
  }

  it("adds the image pending after the others, with its original private and a preview", async () => {
    const response = await upload({
      files: [{ content: PNG, type: "image/png" }],
      altText: " Tapa ",
    }).expect(201);

    const body = response.body as AdminProductImageResult;
    expect(body).toEqual({
      id: expect.any(String) as unknown,
      position: 2,
      previewUrl: expect.any(String) as unknown,
      altText: "Tapa",
      mimeType: "image/png",
      sizeBytes: PNG.length,
      status: "PENDING",
      createdAt: expect.any(String) as unknown,
    });
    const key = `products/${productId}/${body.id}.png`;
    expect(storage.uploaded).toEqual([key]);
    await expect(real.download(StorageBucket.PRIVATE, key)).resolves.toEqual(new Uint8Array(PNG));
    const preview = await fetch(body.previewUrl ?? "");
    expect(new Uint8Array(await preview.arrayBuffer())).toEqual(new Uint8Array(PNG));
    expect((await imageRows()).at(-1)).toEqual({
      id: body.id,
      position: 2,
      status: "PENDING",
      original_key: key,
    });
  });

  it("publishes the image to be processed, and the store does not show it meanwhile", async () => {
    await pool.query(
      `UPDATE libreria.product_images SET status = 'PROCESSED', public_key = 'products/x.webp'
       WHERE product_id = $1`,
      [productId],
    );

    const response = await upload().expect(201);
    await idle();

    expect(published).toEqual([(response.body as AdminProductImageResult).id]);
    const page = await http.get("/api/v1/products/cuaderno-a4").expect(200);
    expect((page.body as { images: unknown[] }).images).toHaveLength(1);
  });

  it("lets a seller add images", async () => {
    await upload({ auth: await tokenFor("SELLER") }).expect(201);
  });

  it("asks to log in without a token", async () => {
    await expectError(upload({ auth: null }), 401, "INVALID_ACCESS_TOKEN");
  });

  describe("the file", () => {
    it.each([
      [
        "of another format, even if declared as JPEG",
        { content: GIF },
        "La imagen tiene que ser JPEG, PNG o WebP.",
      ],
      [
        "over 10 MB",
        { content: Buffer.alloc(TEN_MB + 1, 0xff) },
        "La imagen no puede pesar más de 10 MB.",
      ],
    ])("refuses one %s, uploading nothing", async (_label, file, message) => {
      const body = await expectError(upload({ files: [file] }), 400, "INVALID_IMAGE");

      expect(body.message).toBe(message);
      expect(storage.uploaded).toEqual([]);
      expect(await imageRows()).toHaveLength(1);
    });

    it("takes exactly 10 MB", async () => {
      const content = Buffer.alloc(TEN_MB, 0);
      JPEG.copy(content);

      await upload({ files: [{ content }] }).expect(201);
    });

    it("refuses a long alt text, uploading nothing", async () => {
      const body = await expectError(upload({ altText: "a".repeat(256) }), 400, "INVALID_IMAGE");

      expect(body.message).toBe(
        "La imagen no puede tener un texto alternativo de más de 255 caracteres.",
      );
      expect(storage.uploaded).toEqual([]);
    });

    it.each([
      ["no file", { files: [] }],
      ["two files", { files: [{ content: JPEG }, { content: PNG, type: "image/png" }] }],
      ["the file in another field", { files: [{ content: JPEG, field: "images" }] }],
    ])("refuses %s", async (_label, options) => {
      await expectError(upload(options), 400, "VALIDATION_FAILED");
      expect(storage.uploaded).toEqual([]);
    });

    it.each([
      ["short", "1"],
      ["long", "1".repeat(2000)],
    ])("refuses another field, %s", async (_label, value) => {
      await expectError(upload().field("position", value), 400, "VALIDATION_FAILED");
    });
  });

  describe("the limit of 5", () => {
    it("refuses a sixth image, uploading nothing", async () => {
      await addStoredImages(4);

      const body = await expectError(upload(), 422, "PRODUCT_IMAGE_LIMIT_REACHED");

      expect(body.message).toBe("El producto ya tiene 5 imágenes. Borrá una para subir otra.");
      expect(storage.uploaded).toEqual([]);
    });

    it("lets only one of two uploads at once take the fifth place, removing the other original", async () => {
      await addStoredImages(3);

      const responses = await Promise.all([upload(), upload()]);
      await idle();

      expect(responses.map((response) => response.status).sort()).toEqual([201, 422]);
      const rows = await imageRows();
      expect(rows.map((row) => row.position)).toEqual([1, 2, 3, 4, 5]);
      expect(storage.uploaded).toHaveLength(2);
      const kept = rows.at(-1)?.original_key;
      for (const key of storage.uploaded) {
        const stored = await real.download(StorageBucket.PRIVATE, key).then(
          () => true,
          () => false,
        );
        expect(stored).toBe(key === kept);
      }
    });
  });

  describe("the product", () => {
    it("refuses a deleted one", async () => {
      await pool.query("UPDATE libreria.products SET deleted_at = now() WHERE id = $1", [
        productId,
      ]);

      await expectError(upload(), 422, "PRODUCT_DELETED");
      expect(storage.uploaded).toEqual([]);
    });

    it("takes an inactive one", async () => {
      await pool.query("UPDATE libreria.products SET is_active = false WHERE id = $1", [productId]);

      await upload().expect(201);
    });

    it.each([randomUUID(), "not-an-id"])("answers 404 for %s", async (id) => {
      await expectError(upload({ id }), 404, "PRODUCT_NOT_FOUND");
    });

    it("answers 404 for an id that is not one before reading the form, even without a file", async () => {
      await expectError(upload({ id: "not-an-id", files: [] }), 404, "PRODUCT_NOT_FOUND");
    });

    it("keeps the files under the stored id when the route names it in capitals", async () => {
      const response = await upload({ id: productId.toUpperCase() }).expect(201);

      expect(storage.uploaded).toEqual([
        `products/${productId}/${(response.body as AdminProductImageResult).id}.jpg`,
      ]);
    });
  });

  it("answers 502 when Storage fails, adding nothing", async () => {
    storage.failUploads = true;

    await expectError(upload(), 502, "IMAGE_UPLOAD_FAILED");
    await idle();

    expect(await imageRows()).toHaveLength(1);
    expect(published).toEqual([]);
  });
});
