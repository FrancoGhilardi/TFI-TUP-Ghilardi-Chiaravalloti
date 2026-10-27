import type { INestApplication } from "@nestjs/common";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AccessTokenService } from "./../src/modules/identity/application/ports/access-token-service.js";
import { UserRepository } from "./../src/modules/identity/domain/repositories/user.repository.js";
import { FileStorage } from "./../src/shared/application/file-storage.js";
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

const UNKNOWN_ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000ff";

/** These routes never upload; the detail only needs a link per original. */
class SigningStorage extends FileStorage {
  upload(): Promise<void> {
    return Promise.reject(new Error("Not used"));
  }
  remove(): Promise<void> {
    return Promise.reject(new Error("Not used"));
  }
  signedUrls(keys: string[]): Promise<(string | null)[]> {
    return Promise.resolve(keys.map((key) => `signed://${key}`));
  }

  publicUrl(key: string): string {
    return `public://${key}`;
  }
}

interface ProductRow {
  title: string;
  slug: string;
  sku: string;
  price: string;
  stock: number;
  is_active: boolean;
  is_on_sale: boolean;
  sale_price: string | null;
  updated_by: string | null;
  updated_at: Date;
  deleted_at: Date | null;
}

describe("PATCH, DELETE and restore of /admin/products (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let token: string;
  let actorId: string;
  let productId: string;
  let categoryId: string;

  beforeAll(() => {
    pool = adminPool();
  });

  // A fresh app per test starts the rate limits at zero.
  beforeEach(async () => {
    await truncateAll(pool);
    app = await createTestApp({
      overrides: [{ provide: FileStorage, useValue: new SigningStorage() }],
    });
    http = request(app.getHttpServer());
    // Sellers manage products too.
    actorId = await insertUser(pool, { role: "SELLER", mustChangePassword: false });
    token = await tokenFor(actorId);
    ({ id: productId, categoryId } = await insertProductWithDeps(pool, {
      title: "Cuaderno A4",
      price: "1000.00",
    }));
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

  const patch = (body: unknown, id = productId) =>
    http
      .patch(`/api/v1/admin/products/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send(body as object);

  const remove = (id = productId) =>
    http.delete(`/api/v1/admin/products/${id}`).set("Authorization", `Bearer ${token}`);

  const restore = (id = productId) =>
    http.post(`/api/v1/admin/products/${id}/restore`).set("Authorization", `Bearer ${token}`);

  const expectError = async (pending: request.Test, statusCode: number, code: string) => {
    const response = await pending.expect(statusCode);
    expect((response.body as ErrorResponse).code).toBe(code);
  };

  const row = async (id = productId) =>
    (await pool.query<ProductRow>("SELECT * FROM libreria.products WHERE id = $1", [id])).rows[0];

  const categoriesOf = async (id = productId) =>
    (
      await pool.query<{ category_id: string; is_primary: boolean }>(
        "SELECT category_id, is_primary FROM libreria.product_categories WHERE product_id = $1 ORDER BY is_primary DESC",
        [id],
      )
    ).rows;

  const softDelete = (table: "products" | "categories", id: string) =>
    pool.query(`UPDATE libreria.${table} SET deleted_at = now() WHERE id = $1`, [id]);

  describe("PATCH /admin/products/:id", () => {
    it("changes what is sent and keeps the slug and the SKU, even with a new title", async () => {
      const before = await row();

      const response = await patch({
        title: "Cuaderno Rayado A4",
        price: "1200.50",
        stock: 7,
        isOnSale: true,
        salePrice: "999.99",
      }).expect(200);

      expect(response.body).toMatchObject({
        id: productId,
        title: "Cuaderno Rayado A4",
        slug: before.slug,
        sku: before.sku,
        price: "1200.50",
        salePrice: "999.99",
        isOnSale: true,
        stock: 7,
        updatedBy: { id: actorId },
      });
      expect(await row()).toMatchObject({
        title: "Cuaderno Rayado A4",
        slug: before.slug,
        sku: before.sku,
        price: "1200.50",
        sale_price: "999.99",
        updated_by: actorId,
      });
    });

    it("saves nothing when nothing changes", async () => {
      const before = await row();

      await patch({ title: "Cuaderno A4", stock: before.stock }).expect(200);

      expect(await row()).toEqual(before);
    });

    it("replaces the categories, keeping an assigned one that was hidden", async () => {
      const added = await insertCategory(pool, "Escolar");
      await pool.query("UPDATE libreria.categories SET is_active = false WHERE id = $1", [
        categoryId,
      ]);

      await patch({ categoryIds: [categoryId, added], primaryCategoryId: added }).expect(200);

      expect(await categoriesOf()).toEqual([
        { category_id: added, is_primary: true },
        { category_id: categoryId, is_primary: false },
      ]);
    });

    it("takes the form sent back as it is, with a category and a related product deleted meanwhile", async () => {
      const kept = await insertCategory(pool, "Escolar");
      const { id: otherId } = await insertProductWithDeps(pool, { categoryId });
      await pool.query(
        "INSERT INTO libreria.product_categories (product_id, category_id, is_primary) VALUES ($1, $2, false)",
        [productId, kept],
      );
      await pool.query(
        "INSERT INTO libreria.related_products (product_id, related_product_id, sort_order) VALUES ($1, $2, 0)",
        [productId, otherId],
      );
      await softDelete("products", otherId);
      await softDelete("categories", categoryId);
      const form = {
        stock: 5,
        categoryIds: [categoryId, kept],
        primaryCategoryId: categoryId,
        relatedProductIds: [otherId],
      };

      await patch(form).expect(200);

      expect((await row()).stock).toBe(5);
      // Not once every category it keeps is deleted.
      await softDelete("categories", kept);
      await expectError(patch({ ...form, stock: 6 }), 422, "CATEGORY_UNAVAILABLE");
    });

    it("refuses a new category that is hidden", async () => {
      const hidden = await insertCategory(pool, "Oculta");
      await pool.query("UPDATE libreria.categories SET is_active = false WHERE id = $1", [hidden]);

      await expectError(
        patch({ categoryIds: [categoryId, hidden], primaryCategoryId: categoryId }),
        422,
        "CATEGORY_UNAVAILABLE",
      );
    });

    it("sets and checks the related products", async () => {
      const { id: otherId } = await insertProductWithDeps(pool, { categoryId });

      const response = await patch({ relatedProductIds: [otherId] }).expect(200);

      expect(response.body).toMatchObject({ relatedProducts: [{ id: otherId }] });
      await expectError(patch({ relatedProductIds: [productId] }), 422, "SELF_RELATED_PRODUCT");
      const { id: goneId } = await insertProductWithDeps(pool, { categoryId });
      await softDelete("products", goneId);
      await expectError(
        patch({ relatedProductIds: [otherId, goneId] }),
        422,
        "RELATED_PRODUCT_UNAVAILABLE",
      );
    });

    it.each([
      ["a null field", { stock: null }],
      ["an unknown field", { slug: "otro" }],
      ["a sale price without the sale", { salePrice: "10" }],
      ["categories without their primary one", { categoryIds: [UNKNOWN_ID] }],
    ])("refuses %s with 400", async (_label, body) => {
      await expectError(patch(body), 400, "VALIDATION_FAILED");
    });

    it("refuses a sale price that is not lower", async () => {
      await expectError(patch({ isOnSale: true, salePrice: "1000" }), 422, "SALE_PRICE_NOT_LOWER");
    });

    it("refuses a deleted product", async () => {
      await softDelete("products", productId);

      await expectError(patch({ stock: 1 }), 422, "PRODUCT_DELETED");
    });

    it.each([UNKNOWN_ID, "not-a-uuid"])("answers 404 for %s", async (id) => {
      await expectError(patch({ stock: 1 }, id), 404, "PRODUCT_NOT_FOUND");
    });
  });

  describe("DELETE /admin/products/:id", () => {
    it("deletes logically, keeping the active state and the images, and again changes nothing", async () => {
      await pool.query("UPDATE libreria.products SET is_active = false WHERE id = $1", [productId]);

      await remove().expect(204);
      const deleted = await row();
      await remove().expect(204);

      expect(deleted).toMatchObject({ is_active: false, updated_by: actorId });
      expect(deleted.deleted_at).toBeInstanceOf(Date);
      expect(await row()).toEqual(deleted);
      const images = await pool.query(
        "SELECT 1 FROM libreria.product_images WHERE product_id = $1",
        [productId],
      );
      expect(images.rowCount).toBe(1);
    });

    it.each([UNKNOWN_ID, "not-a-uuid"])("answers 404 for %s", async (id) => {
      await expectError(remove(id), 404, "PRODUCT_NOT_FOUND");
    });
  });

  describe("POST /admin/products/:id/restore", () => {
    it("restores with the state, slug and SKU it had before the deletion", async () => {
      await pool.query("UPDATE libreria.products SET is_active = false WHERE id = $1", [productId]);
      await remove().expect(204);
      const before = await row();

      const response = await restore().expect(200);

      expect(response.body).toMatchObject({
        id: productId,
        isActive: false,
        slug: before.slug,
        sku: before.sku,
        deletedAt: null,
      });
      expect(await row()).toMatchObject({
        is_active: false,
        slug: before.slug,
        sku: before.sku,
        deleted_at: null,
        updated_by: actorId,
      });
    });

    it("refuses a product whose categories are all deleted, until one is restored", async () => {
      await remove().expect(204);
      await softDelete("categories", categoryId);

      await expectError(restore(), 422, "PRODUCT_WITHOUT_CATEGORY");
      expect((await row()).deleted_at).toBeInstanceOf(Date);

      await pool.query("UPDATE libreria.categories SET deleted_at = NULL WHERE id = $1", [
        categoryId,
      ]);
      await restore().expect(200);
    });

    it("refuses a product that is not deleted", async () => {
      await expectError(restore(), 422, "PRODUCT_NOT_DELETED");
    });

    it.each([UNKNOWN_ID, "not-a-uuid"])("answers 404 for %s", async (id) => {
      await expectError(restore(id), 404, "PRODUCT_NOT_FOUND");
    });
  });
});
