import type { INestApplication } from "@nestjs/common";
import type { Pool } from "pg";
import sharp from "sharp";
import request from "supertest";
import type { App } from "supertest/types.js";
import { ProcessProductImageUseCase } from "./../src/modules/catalog/application/use-cases/process-product-image.use-case.js";
import { AccessTokenService } from "./../src/modules/identity/application/ports/access-token-service.js";
import { UserRepository } from "./../src/modules/identity/domain/repositories/user.repository.js";
import { BackgroundTasks } from "./../src/shared/application/background-tasks.js";
import { StorageBucket } from "./../src/shared/application/file-storage.js";
import type { LoggingBackgroundTasks } from "./../src/shared/infrastructure/logging-background-tasks.js";
import {
  createStorageClient,
  SupabaseFileStorage,
} from "./../src/shared/infrastructure/storage/supabase-file-storage.js";
import { createTestApp } from "./create-test-app.js";
import { adminPool, insertCategory, insertUser, truncateAll } from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

// Starts like a JPEG, so the upload takes it, but no picture can be read from it.
const BROKEN_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 1, 2, 3]);

interface ImageRow {
  [column: string]: unknown;
  id: string;
  status: string;
  original_key: string;
  public_key: string | null;
  width: number | null;
  height: number | null;
}

describe("Processing of product images (e2e)", () => {
  const storage = new SupabaseFileStorage(
    createStorageClient(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    ),
  );
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let token: string;
  let categoryId: string;
  let photo: Buffer;

  beforeAll(async () => {
    pool = adminPool();
    photo = await sharp({
      create: { width: 2000, height: 1600, channels: 3, background: { r: 20, g: 120, b: 60 } },
    })
      .jpeg()
      .toBuffer();
  });

  beforeEach(async () => {
    await truncateAll(pool);
    app = await createTestApp();
    http = request(app.getHttpServer());
    const id = await insertUser(pool, { role: "ADMIN", mustChangePassword: false });
    const user = await app.get(UserRepository, { strict: false }).findById(id);
    token = app.get(AccessTokenService, { strict: false }).issue(user!).token;
    categoryId = await insertCategory(pool, "Cuadernos");
  });

  afterEach(async () => {
    await idle();
    const rows = await allImages();
    await storage.remove(
      StorageBucket.PRIVATE,
      rows.map((row) => row.original_key),
    );
    await storage.remove(
      StorageBucket.PUBLIC,
      rows.flatMap((row) => (row.public_key ? [row.public_key] : [])),
    );
    await app.close();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await pool.end();
  });

  const idle = () => app.get<BackgroundTasks, LoggingBackgroundTasks>(BackgroundTasks).idle();

  const allImages = async () =>
    (
      await pool.query<ImageRow>(
        `SELECT id, status, original_key, public_key, width, height
         FROM libreria.product_images ORDER BY position`,
      )
    ).rows;

  async function createProduct(files: Buffer[]): Promise<string> {
    let pending = http
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .field(
        "data",
        JSON.stringify({
          title: "Cuaderno A4",
          price: "1500",
          isOnSale: false,
          stock: 3,
          isFeatured: false,
          isNew: false,
          isActive: true,
          categoryIds: [categoryId],
          primaryCategoryId: categoryId,
        }),
      );
    for (const file of files) {
      pending = pending.attach("images", file, {
        filename: "photo.jpg",
        contentType: "image/jpeg",
      });
    }
    const response = await pending.expect(201);
    await idle();
    return (response.body as { id: string }).id;
  }

  it("leaves each image processed with a 4:5 WebP public version and its size", async () => {
    const productId = await createProduct([photo]);

    const [image] = await allImages();
    expect(image).toMatchObject({ status: "PROCESSED", width: 1200, height: 1500 });
    expect(image.public_key).toMatch(
      new RegExp(`^products/${productId}/${image.id}-v[0-9a-f-]{36}\\.webp$`),
    );
    const served = await fetch(storage.publicUrl(image.public_key ?? ""));
    expect(served.status).toBe(200);
    await expect(sharp(Buffer.from(await served.arrayBuffer())).metadata()).resolves.toMatchObject({
      format: "webp",
      width: 1200,
      height: 1500,
    });
  });

  it("shows the product in the store once its image is processed", async () => {
    await createProduct([photo]);

    const response = await http.get("/api/v1/products/cuaderno-a4").expect(200);

    expect((response.body as { images: unknown[] }).images).toEqual([
      expect.objectContaining({ width: 1200, height: 1500 }),
    ]);
  });

  it("marks failed an image that cannot be read, without a public version, and the rest processed", async () => {
    await createProduct([BROKEN_JPEG, photo]);

    const [broken, good] = await allImages();
    expect(broken).toMatchObject({ status: "FAILED", public_key: null, width: null, height: null });
    expect(good).toMatchObject({ status: "PROCESSED" });
    await http.get("/api/v1/products/cuaderno-a4").expect(200);
  });

  it("keeps out of the store a product whose only image failed", async () => {
    await createProduct([BROKEN_JPEG]);

    await http.get("/api/v1/products/cuaderno-a4").expect(404);
  });

  it("processes an image added later too", async () => {
    const productId = await createProduct([photo]);

    await http
      .post(`/api/v1/admin/products/${productId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .attach("image", photo, { filename: "photo.jpg", contentType: "image/jpeg" })
      .expect(201);
    await idle();

    expect((await allImages()).map((image) => image.status)).toEqual(["PROCESSED", "PROCESSED"]);
  });

  it("does not process an image again", async () => {
    await createProduct([photo]);
    const [before] = await allImages();

    await expect(app.get(ProcessProductImageUseCase).execute(before.id)).resolves.toBe("skipped");

    await expect(allImages()).resolves.toEqual([before]);
  });
});
