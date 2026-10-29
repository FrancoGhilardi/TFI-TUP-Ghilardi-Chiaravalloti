import { randomUUID } from "node:crypto";
import { type INestApplication, Logger } from "@nestjs/common";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import { ProcessProductImageUseCase } from "./../src/modules/catalog/application/use-cases/process-product-image.use-case.js";
import { AccessTokenService } from "./../src/modules/identity/application/ports/access-token-service.js";
import { UserRepository } from "./../src/modules/identity/domain/repositories/user.repository.js";
import { FileStorage, StorageBucket } from "./../src/shared/application/file-storage.js";
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
const WEBP = Buffer.from([0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

/** The real Storage, refusing to remove on demand. */
class FlakyStorage extends FileStorage {
  failRemovals = false;

  constructor(private readonly real: FileStorage) {
    super();
  }

  upload(bucket: StorageBucket, key: string, body: Uint8Array, contentType: string) {
    return this.real.upload(bucket, key, body, contentType);
  }

  remove(bucket: StorageBucket, keys: string[]) {
    return this.failRemovals
      ? Promise.reject(new Error("storage down"))
      : this.real.remove(bucket, keys);
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
  original_key: string;
  public_key: string | null;
}

describe("DELETE /admin/products/:productId/images/:imageId (e2e)", () => {
  const real = new SupabaseFileStorage(
    createStorageClient(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    ),
  );
  const leftovers: { bucket: StorageBucket; key: string }[] = [];
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let storage: FlakyStorage;
  let token: string;
  let productId: string;
  let images: ImageRow[];

  beforeAll(() => {
    pool = adminPool();
  });

  // A fresh app per test starts the rate limits at zero.
  beforeEach(async () => {
    await truncateAll(pool);
    storage = new FlakyStorage(real);
    app = await createTestApp({
      overrides: [
        { provide: FileStorage, useValue: storage },
        { provide: ProcessProductImageUseCase, useValue: { execute: () => Promise.resolve() } },
      ],
    });
    http = request(app.getHttpServer());
    token = await tokenFor("ADMIN");
    const categoryId = await insertCategory(pool, "Cuadernos");
    productId = (await insertProductWithDeps(pool, { title: "Cuaderno A4", categoryId })).id;
    await insertImage(pool, productId, 2);
    await insertImage(pool, productId, 3);
    // Every image with its original stored, and processed with its public version.
    for (const row of await imageRows()) {
      const original = `products/${productId}/${row.id}.jpg`;
      const publicKey = `products/${productId}/${row.id}-v1.webp`;
      await pool.query(
        `UPDATE libreria.product_images
         SET original_key = $2, public_key = $3, status = 'PROCESSED', width = 800, height = 1000
         WHERE id = $1`,
        [row.id, original, publicKey],
      );
      await real.upload(StorageBucket.PRIVATE, original, JPEG, "image/jpeg");
      await real.upload(StorageBucket.PUBLIC, publicKey, WEBP, "image/webp");
      leftovers.push(
        { bucket: StorageBucket.PRIVATE, key: original },
        { bucket: StorageBucket.PUBLIC, key: publicKey },
      );
    }
    images = await imageRows();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  afterAll(async () => {
    for (const bucket of [StorageBucket.PRIVATE, StorageBucket.PUBLIC]) {
      await real.remove(
        bucket,
        leftovers.filter((file) => file.bucket === bucket).map((file) => file.key),
      );
    }
    await truncateAll(pool);
    await pool.end();
  });

  async function tokenFor(role: "ADMIN" | "SELLER"): Promise<string> {
    const id = await insertUser(pool, { role, mustChangePassword: false });
    const user = await app.get(UserRepository, { strict: false }).findById(id);
    if (!user) throw new Error(`User ${id} not found`);
    return app.get(AccessTokenService, { strict: false }).issue(user).token;
  }

  async function imageRows(id = productId): Promise<ImageRow[]> {
    const { rows } = await pool.query<ImageRow>(
      `SELECT id, position, original_key, public_key FROM libreria.product_images
       WHERE product_id = $1 ORDER BY position`,
      [id],
    );
    return rows;
  }

  const stored = (bucket: StorageBucket, key: string) =>
    real.download(bucket, key).then(
      () => true,
      () => false,
    );

  const remove = (imageId: string, id = productId, auth: string | null = token) => {
    const pending = http.delete(`/api/v1/admin/products/${id}/images/${imageId}`);
    return auth === null ? pending : pending.set("Authorization", `Bearer ${auth}`);
  };

  const expectError = async (pending: request.Test, statusCode: number, code: string) => {
    const response = await pending.expect(statusCode);
    expect((response.body as ErrorResponse).code).toBe(code);
  };

  it("removes the image, numbers the others from 1 and removes its files", async () => {
    const [first, middle, last] = images;

    const response = await remove(middle.id).expect(204);

    expect(response.text).toBe("");
    expect((await imageRows()).map((row) => [row.id, row.position])).toEqual([
      [first.id, 1],
      [last.id, 2],
    ]);
    await expect(stored(StorageBucket.PRIVATE, middle.original_key)).resolves.toBe(false);
    await expect(stored(StorageBucket.PUBLIC, middle.public_key ?? "")).resolves.toBe(false);
    await expect(stored(StorageBucket.PRIVATE, first.original_key)).resolves.toBe(true);
    const page = await http.get("/api/v1/products/cuaderno-a4").expect(200);
    expect((page.body as { images: { id: string }[] }).images.map((image) => image.id)).toEqual([
      first.id,
      last.id,
    ]);
  });

  it("never removes the last image, touching neither the row nor its files", async () => {
    await remove(images[0].id).expect(204);
    await remove(images[1].id).expect(204);
    const [only] = await imageRows();

    await expectError(remove(only.id), 422, "LAST_PRODUCT_IMAGE");

    expect(await imageRows()).toEqual([only]);
    await expect(stored(StorageBucket.PRIVATE, only.original_key)).resolves.toBe(true);
  });

  it("lets only one of two deletions at once go through on a product with two images", async () => {
    await remove(images[2].id).expect(204);

    const responses = await Promise.all([remove(images[0].id), remove(images[1].id)]);

    expect(responses.map((response) => response.status).sort()).toEqual([204, 422]);
    const left = await imageRows();
    expect(left).toHaveLength(1);
    expect(left[0].position).toBe(1);
  });

  it("answers 204 when the storage keeps the files, logging them to be removed by hand", async () => {
    storage.failRemovals = true;
    const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const [, middle] = images;

    await remove(middle.id).expect(204);

    expect(await imageRows()).toHaveLength(2);
    const logged = error.mock.calls.map(([message]) => String(message));
    for (const key of [middle.original_key, middle.public_key]) {
      expect(logged).toContainEqual(
        expect.stringContaining(
          `File ${key} of the deleted image ${middle.id} was left in storage\nError: storage down`,
        ),
      );
    }
  });

  it("answers 404 for an image of another product, an unknown one or an id that is not one", async () => {
    const other = (await insertProductWithDeps(pool, { title: "Otro" })).id;
    const [foreign] = await imageRows(other);

    for (const imageId of [foreign.id, randomUUID(), "not-an-id"]) {
      await expectError(remove(imageId), 404, "PRODUCT_IMAGE_NOT_FOUND");
    }
    expect(await imageRows()).toHaveLength(3);
  });

  it("refuses a deleted product and answers 404 for an unknown one", async () => {
    await expectError(remove(images[0].id, randomUUID()), 404, "PRODUCT_NOT_FOUND");
    await pool.query("UPDATE libreria.products SET deleted_at = now() WHERE id = $1", [productId]);

    await expectError(remove(images[0].id), 422, "PRODUCT_DELETED");
    expect(await imageRows()).toHaveLength(3);
  });

  it("lets a seller delete, and asks to log in without a token", async () => {
    await expectError(remove(images[0].id, productId, null), 401, "INVALID_ACCESS_TOKEN");

    await remove(images[0].id, productId, await tokenFor("SELLER")).expect(204);
  });
});
