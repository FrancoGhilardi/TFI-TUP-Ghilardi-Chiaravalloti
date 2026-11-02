import type { INestApplication } from "@nestjs/common";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { AdminProductDetailResult } from "./../src/modules/catalog/application/dto/admin-product-detail.result.js";
import { AccessTokenService } from "./../src/modules/identity/application/ports/access-token-service.js";
import { UserRepository } from "./../src/modules/identity/domain/repositories/user.repository.js";
import { FileStorage } from "./../src/shared/application/file-storage.js";
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

const UNKNOWN_ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000ff";

/** Signs every original with a fake link, or fails to on demand. */
class SigningStorage extends FileStorage {
  failSigning = false;

  upload(): Promise<void> {
    return Promise.reject(new Error("Not used"));
  }

  remove(): Promise<void> {
    return Promise.reject(new Error("Not used"));
  }

  download(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  signedUrls(keys: string[], expiresInSeconds: number): Promise<(string | null)[]> {
    return this.failSigning
      ? Promise.reject(new Error("storage down"))
      : Promise.resolve(keys.map((key) => `signed://${key}?ttl=${expiresInSeconds}`));
  }

  publicUrl(key: string): string {
    return `public://${key}`;
  }
}

describe("GET /admin/products/:id (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let storage: SigningStorage;
  let token: string;
  let sellerId: string;
  let productId: string;
  let primaryId: string;

  beforeAll(() => {
    pool = adminPool();
  });

  // A fresh app per test starts the rate limits at zero.
  beforeEach(async () => {
    await truncateAll(pool);
    storage = new SigningStorage();
    app = await createTestApp({ overrides: [{ provide: FileStorage, useValue: storage }] });
    http = request(app.getHttpServer());
    sellerId = await insertUser(pool, { role: "SELLER", mustChangePassword: false });
    token = await tokenFor(sellerId);
    primaryId = await insertCategory(pool, "Cuadernos");
    ({ id: productId } = await insertProductWithDeps(pool, {
      title: "Cuaderno A4",
      categoryId: primaryId,
      price: "1500.50",
    }));
    await pool.query(
      "UPDATE libreria.products SET created_by = $2, updated_by = $2 WHERE id = $1",
      [productId, sellerId],
    );
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await pool.end();
  });

  async function tokenFor(id: string): Promise<string> {
    const user = await app.get(UserRepository, { strict: false }).findById(id);
    if (!user) throw new Error(`User ${id} not found`);
    return app.get(AccessTokenService, { strict: false }).issue(user).token;
  }

  const detail = (id = productId, auth: string | null = token) => {
    const pending = http.get(`/api/v1/admin/products/${id}`);
    return auth === null ? pending : pending.set("Authorization", `Bearer ${auth}`);
  };

  const expectError = async (pending: request.Test, statusCode: number, code: string) => {
    const response = await pending.expect(statusCode);
    expect((response.body as ErrorResponse).code).toBe(code);
  };

  it("gives the product with its categories, related products, authors and images", async () => {
    const secondId = await insertCategory(pool, "Escolar");
    await pool.query(
      "INSERT INTO libreria.product_categories (product_id, category_id, is_primary) VALUES ($1, $2, false)",
      [productId, secondId],
    );
    const { id: relatedId } = await insertProductWithDeps(pool, { title: "Lapiz HB" });
    await pool.query(
      "INSERT INTO libreria.related_products (product_id, related_product_id, sort_order) VALUES ($1, $2, 0)",
      [productId, relatedId],
    );
    await insertImage(pool, productId, 2);
    await insertImage(pool, productId, 3);
    await pool.query(
      `UPDATE libreria.product_images SET status = 'PROCESSED', public_key = 'products/p.webp'
       WHERE product_id = $1 AND position = 2`,
      [productId],
    );
    await pool.query(
      "UPDATE libreria.product_images SET status = 'FAILED' WHERE product_id = $1 AND position = 3",
      [productId],
    );

    const response = await detail().expect(200);

    // Its preview links expire: no copy may be kept.
    expect(response.headers["cache-control"]).toBe("no-store");
    const body = response.body as AdminProductDetailResult;
    expect(body).toMatchObject({
      id: productId,
      title: "Cuaderno A4",
      slug: "cuaderno-a4",
      price: "1500.50",
      isOnSale: false,
      salePrice: null,
      isActive: true,
      primaryCategoryId: primaryId,
      categories: [
        { id: primaryId, name: "Cuadernos", slug: "cuadernos" },
        { id: secondId, name: "Escolar", slug: "escolar" },
      ],
      relatedProducts: [expect.objectContaining({ id: relatedId, title: "Lapiz HB" })],
      createdBy: { id: sellerId, name: "Test user" },
      updatedBy: { id: sellerId, name: "Test user" },
      deletedAt: null,
    });
    expect(body.sku).toMatch(/^LMS-\d{6,}$/);
    expect(body.images.map((image) => [image.position, image.status])).toEqual([
      [1, "PENDING"],
      [2, "PROCESSED"],
      [3, "FAILED"],
    ]);
    for (const image of body.images) {
      expect(image.previewUrl).toMatch(/^signed:\/\/.+\?ttl=600$/);
    }
  });

  it("gives a deleted product, with its deleted category and related product", async () => {
    const goneId = await insertCategory(pool, "Viejos");
    await pool.query(
      "INSERT INTO libreria.product_categories (product_id, category_id, is_primary) VALUES ($1, $2, false)",
      [productId, goneId],
    );
    const { id: relatedId } = await insertProductWithDeps(pool, { title: "Lapiz HB" });
    await pool.query(
      "INSERT INTO libreria.related_products (product_id, related_product_id, sort_order) VALUES ($1, $2, 0)",
      [productId, relatedId],
    );
    await pool.query("UPDATE libreria.categories SET deleted_at = now() WHERE id = $1", [goneId]);
    await pool.query("UPDATE libreria.products SET deleted_at = now() WHERE id = ANY($1)", [
      [productId, relatedId],
    ]);

    const response = await detail().expect(200);

    const body = response.body as AdminProductDetailResult;
    expect(body.deletedAt).not.toBeNull();
    expect(body.images.map(({ position, status }) => [position, status])).toEqual([[1, "PENDING"]]);
    expect(body.images[0].previewUrl).toMatch(/^signed:\/\//);
    expect(body.categories.map((category) => category.id)).toEqual([primaryId, goneId]);
    expect(body.relatedProducts.map((product) => product.id)).toEqual([relatedId]);
  });

  it("gives a sale and a new mark that already ended as they are stored", async () => {
    await pool.query(
      `UPDATE libreria.products
       SET is_on_sale = true, sale_price = '1000.00', sale_ends_at = '2026-01-01T00:00:00Z',
         is_new = true, new_until = '2026-01-01T00:00:00Z'
       WHERE id = $1`,
      [productId],
    );

    const response = await detail().expect(200);

    expect(response.body).toMatchObject({
      isOnSale: true,
      salePrice: "1000.00",
      saleEndsAt: "2026-01-01T00:00:00.000Z",
      isNew: true,
      newUntil: "2026-01-01T00:00:00.000Z",
    });
  });

  it("still gives the product, without links, when the storage cannot sign them", async () => {
    storage.failSigning = true;

    const response = await detail().expect(200);

    expect((response.body as AdminProductDetailResult).images).toEqual([
      expect.objectContaining({ position: 1, previewUrl: null }),
    ]);
  });

  it.each([UNKNOWN_ID, "not-an-id"])("answers 404 for %s", async (id) => {
    await expectError(detail(id), 404, "PRODUCT_NOT_FOUND");
  });

  it("asks to log in without a token", async () => {
    await expectError(detail(productId, null), 401, "INVALID_ACCESS_TOKEN");
  });
});
