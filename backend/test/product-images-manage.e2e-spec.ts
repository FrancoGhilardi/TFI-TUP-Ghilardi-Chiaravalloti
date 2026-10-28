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

interface ImageRow {
  [column: string]: unknown;
  id: string;
  position: number;
  status: string;
  original_key: string;
  alt_text: string | null;
  mime_type: string;
}

describe("Managing the images of a product (e2e)", () => {
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
  let imageIds: string[];
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
        // The images stay as each test leaves them: their processing is tested on its own.
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
    await insertImage(pool, productId, 2);
    await insertImage(pool, productId, 3);
    imageIds = (await imageRows()).map((row) => row.id);
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

  const imageRows = async (id = productId) =>
    (
      await pool.query<ImageRow>(
        `SELECT id, position, status, original_key, alt_text, mime_type
         FROM libreria.product_images WHERE product_id = $1 ORDER BY position`,
        [id],
      )
    ).rows;

  const authed = (pending: request.Test) => pending.set("Authorization", `Bearer ${token}`);
  const base = (id = productId) => `/api/v1/admin/products/${id}/images`;

  const reorder = (ids: unknown, id = productId) =>
    authed(http.patch(`${base(id)}/order`)).send({ imageIds: ids });
  const editAltText = (imageId: string, body: unknown, id = productId) =>
    authed(http.patch(`${base(id)}/${imageId}`)).send(body as object);
  const replace = (imageId: string, file: Buffer = PNG, id = productId) =>
    authed(http.put(`${base(id)}/${imageId}/file`)).attach("image", file, {
      filename: "image.png",
      contentType: "image/png",
    });
  const retry = (imageId: string, id = productId) =>
    authed(http.post(`${base(id)}/${imageId}/retry`));

  const expectError = async (pending: request.Test, statusCode: number, code: string) => {
    const response = await pending.expect(statusCode);
    const body = response.body as ErrorResponse;
    expect(body.code).toBe(code);
    return body;
  };

  describe("PATCH …/order", () => {
    it("puts the images in the order sent, from position 1, and gives them", async () => {
      const order = [imageIds[2], imageIds[0], imageIds[1]];

      const response = await reorder(order.map((id) => id.toUpperCase())).expect(200);

      expect((response.body as AdminProductImageResult[]).map((image) => image.id)).toEqual(order);
      expect((await imageRows()).map((row) => [row.id, row.position])).toEqual([
        [order[0], 1],
        [order[1], 2],
        [order[2], 3],
      ]);
    });

    it("takes the same order, changing nothing", async () => {
      await reorder(imageIds).expect(200);

      expect((await imageRows()).map((row) => row.id)).toEqual(imageIds);
    });

    it.each([
      ["one missing", () => imageIds.slice(0, 2)],
      ["one repeated", () => [imageIds[0], imageIds[0], imageIds[1]]],
      ["one unknown", () => [imageIds[0], imageIds[1], randomUUID()]],
    ])("refuses an order with %s", async (_label, ids) => {
      const body = await expectError(reorder(ids()), 400, "INVALID_IMAGE_ORDER");

      expect(body.message).toBe("Mandá todas las imágenes del producto, cada una una sola vez.");
      expect((await imageRows()).map((row) => row.id)).toEqual(imageIds);
    });

    it("refuses an image of another product", async () => {
      const other = (await insertProductWithDeps(pool, { title: "Otro" })).id;
      const [foreign] = await imageRows(other);

      await expectError(
        reorder([imageIds[0], imageIds[1], foreign.id]),
        400,
        "INVALID_IMAGE_ORDER",
      );
    });

    it.each([[[]], [["not-an-id"]], [null]])("refuses %o as the order", async (ids) => {
      await expectError(reorder(ids), 400, "VALIDATION_FAILED");
    });
  });

  describe("PATCH …/:imageId", () => {
    it("changes the alt text, trimmed, and removes it when blank", async () => {
      const response = await editAltText(imageIds[1], { altText: " Contratapa " }).expect(200);

      expect(response.body).toMatchObject({ id: imageIds[1], altText: "Contratapa" });
      await editAltText(imageIds[1], { altText: "" }).expect(200);
      expect((await imageRows())[1].alt_text).toBeNull();
    });

    it("refuses a long alt text", async () => {
      const body = await expectError(
        editAltText(imageIds[0], { altText: "a".repeat(256) }),
        400,
        "INVALID_IMAGE",
      );

      expect(body.message).toBe(
        "La imagen no puede tener un texto alternativo de más de 255 caracteres.",
      );
    });

    it.each([{}, { altText: null }, { altText: "Tapa", position: 2 }])(
      "refuses %o",
      async (body) => {
        await expectError(editAltText(imageIds[0], body), 400, "VALIDATION_FAILED");
      },
    );
  });

  describe("PUT …/:imageId/file", () => {
    it("stores the new original under a key of its own and sends the image back to pending", async () => {
      const [before] = await imageRows();
      await real.upload(StorageBucket.PRIVATE, before.original_key, JPEG, "image/jpeg");
      await pool.query(
        `UPDATE libreria.product_images
         SET status = 'PROCESSED', public_key = 'products/old.webp', width = 800, height = 1000
         WHERE id = $1`,
        [before.id],
      );

      const response = await replace(before.id).expect(200);
      await idle();

      expect(response.body).toMatchObject({
        id: before.id,
        status: "PENDING",
        mimeType: "image/png",
        sizeBytes: PNG.length,
      });
      const [after] = await imageRows();
      expect(after.original_key).toMatch(
        new RegExp(`^products/${productId}/${before.id}-[0-9a-f-]{36}\\.png$`),
      );
      expect(storage.uploaded).toEqual([after.original_key]);
      await expect(real.download(StorageBucket.PRIVATE, after.original_key)).resolves.toEqual(
        new Uint8Array(PNG),
      );
      await expect(real.download(StorageBucket.PRIVATE, before.original_key)).rejects.toThrow();
      const { rows } = await pool.query(
        "SELECT public_key, width, height FROM libreria.product_images WHERE id = $1",
        [before.id],
      );
      expect(rows[0]).toEqual({ public_key: "products/old.webp", width: 800, height: 1000 });
      expect(published).toEqual([before.id]);
    });

    it("refuses a file of another format, uploading nothing", async () => {
      await expectError(replace(imageIds[0], GIF), 400, "INVALID_IMAGE");
      expect(storage.uploaded).toEqual([]);
    });

    it("refuses an alt text sent along", async () => {
      await expectError(replace(imageIds[0]).field("altText", "Tapa"), 400, "VALIDATION_FAILED");
    });

    it("answers 502 when Storage fails, keeping the image as it was", async () => {
      storage.failUploads = true;
      const [before] = await imageRows();

      await expectError(replace(before.id), 502, "IMAGE_UPLOAD_FAILED");
      await idle();

      expect((await imageRows())[0]).toEqual(before);
      expect(published).toEqual([]);
    });
  });

  describe("POST …/:imageId/retry", () => {
    it("sends a failed image back to pending and publishes it", async () => {
      await pool.query("UPDATE libreria.product_images SET status = 'FAILED' WHERE id = $1", [
        imageIds[2],
      ]);

      const response = await retry(imageIds[2]).expect(200);
      await idle();

      expect(response.body).toMatchObject({ id: imageIds[2], status: "PENDING" });
      expect(published).toEqual([imageIds[2]]);
    });

    it("publishes the stored id when the route names the image in capitals", async () => {
      await pool.query("UPDATE libreria.product_images SET status = 'FAILED' WHERE id = $1", [
        imageIds[2],
      ]);

      await retry(imageIds[2].toUpperCase()).expect(200);
      await idle();

      expect(published).toEqual([imageIds[2]]);
    });

    it("refuses an image whose processing did not fail", async () => {
      const body = await expectError(retry(imageIds[0]), 422, "IMAGE_NOT_FAILED");

      expect(body.message).toBe("Solo se puede reintentar una imagen cuyo procesado falló.");
    });
  });

  describe("every operation", () => {
    const operations = (imageId: string, id = productId) => [
      () => reorder([imageId], id),
      () => editAltText(imageId, { altText: "Tapa" }, id),
      () => replace(imageId, PNG, id),
      () => retry(imageId, id),
    ];

    it("refuses a deleted product", async () => {
      await pool.query("UPDATE libreria.products SET deleted_at = now() WHERE id = $1", [
        productId,
      ]);

      for (const operation of operations(imageIds[0])) {
        await expectError(operation(), 422, "PRODUCT_DELETED");
      }
      expect(storage.uploaded).toEqual([]);
    });

    it.each([randomUUID(), "not-an-id"])("answers 404 for the product %s", async (id) => {
      for (const operation of operations(imageIds[0], id)) {
        await expectError(operation(), 404, "PRODUCT_NOT_FOUND");
      }
    });

    it("answers 404 for an image of another product, an unknown one or an id that is not one", async () => {
      const other = (await insertProductWithDeps(pool, { title: "Otro" })).id;
      const [foreign] = await imageRows(other);

      for (const imageId of [foreign.id, randomUUID(), "not-an-id"]) {
        for (const operation of operations(imageId).slice(1)) {
          await expectError(operation(), 404, "PRODUCT_IMAGE_NOT_FOUND");
        }
      }
      expect(storage.uploaded).toEqual([]);
    });

    it("lets a seller do them", async () => {
      token = await tokenFor("SELLER");

      await reorder(imageIds).expect(200);
      await editAltText(imageIds[0], { altText: "Tapa" }).expect(200);
      await replace(imageIds[0]).expect(200);
    });
  });
});
