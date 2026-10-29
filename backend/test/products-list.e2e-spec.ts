import type { INestApplication } from "@nestjs/common";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { AdminProductListItemResult } from "./../src/modules/catalog/application/dto/admin-product-list-item.result.js";
import { AccessTokenService } from "./../src/modules/identity/application/ports/access-token-service.js";
import { UserRepository } from "./../src/modules/identity/domain/repositories/user.repository.js";
import { FileStorage } from "./../src/shared/application/file-storage.js";
import type { Page } from "./../src/shared/application/pagination.js";
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

/** Signs every original with a fake link; nothing is uploaded here. */
class SigningStorage extends FileStorage {
  upload(): Promise<void> {
    return Promise.reject(new Error("Not used"));
  }

  remove(): Promise<void> {
    return Promise.reject(new Error("Not used"));
  }

  download(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  signedUrls(keys: string[]): Promise<(string | null)[]> {
    return Promise.resolve(keys.map((key) => `signed://${key}`));
  }

  publicUrl(key: string): string {
    return `public://${key}`;
  }
}

describe("GET /admin/products (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let token: string;
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
    token = await tokenFor("SELLER");
    categoryId = await insertCategory(pool, "Cuadernos");
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await pool.end();
  });

  async function tokenFor(role: "ADMIN" | "SELLER"): Promise<string> {
    const id = await insertUser(pool, { role, mustChangePassword: false });
    const user = await app.get(UserRepository, { strict: false }).findById(id);
    if (!user) throw new Error(`User ${id} not found`);
    return app.get(AccessTokenService, { strict: false }).issue(user).token;
  }

  async function product(title: string, assignment = ""): Promise<string> {
    const { id } = await insertProductWithDeps(pool, { title, categoryId });
    if (assignment !== "") {
      await pool.query(`UPDATE libreria.products SET ${assignment} WHERE id = $1`, [id]);
    }
    return id;
  }

  const list = (query: Record<string, unknown> = {}, auth: string | null = token) => {
    const pending = http.get("/api/v1/admin/products").query(query);
    return auth === null ? pending : pending.set("Authorization", `Bearer ${auth}`);
  };

  const titlesOf = (response: request.Response) =>
    (response.body as Page<AdminProductListItemResult>).items.map((item) => item.title);

  it("gives a page of rows, the last changed first, not kept by any cache", async () => {
    await product("Primero");
    await product("Segundo");

    const response = await list().expect(200);

    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toMatchObject({ page: 1, limit: 20, totalItems: 2, totalPages: 1 });
    expect(titlesOf(response)).toEqual(["Segundo", "Primero"]);
    expect((response.body as Page<AdminProductListItemResult>).items[0]).toMatchObject({
      slug: "segundo",
      price: "10.00",
      salePrice: null,
      isOnSale: false,
      primaryCategory: { id: categoryId, name: "Cuadernos", slug: "cuadernos" },
      thumbnail: { url: expect.stringMatching(/^signed:\/\//) as unknown },
      deletedAt: null,
    });
  });

  it("combines the search, the filters and the order", async () => {
    await product("Cuaderno rayado", "is_featured = true, stock = 2");
    await product("Cuaderno liso", "is_featured = true, stock = 30");
    await product("Cuaderno borrado", "is_featured = true, stock = 1, deleted_at = now()");
    await product("Lapiz", "is_featured = true, stock = 1");

    const response = await list({
      q: "cuaderno",
      categoryId: categoryId.toUpperCase(),
      isFeatured: "true",
      maxStock: 10,
      status: "ALL",
      sortBy: "STOCK",
      sortDir: "DESC",
    }).expect(200);

    expect(titlesOf(response)).toEqual(["Cuaderno rayado", "Cuaderno borrado"]);
  });

  it("shows only the products not deleted without a status", async () => {
    await product("Vigente");
    await product("Inactivo", "is_active = false");
    await product("Borrado", "deleted_at = now()");

    const response = await list({ sortBy: "TITLE" }).expect(200);

    expect(titlesOf(response)).toEqual(["Inactivo", "Vigente"]);
  });

  it.each([
    [{ limit: 101 }],
    [{ page: 0 }],
    [{ categoryId: "cuadernos" }],
    [{ isOnSale: "si" }],
    [{ maxStock: -1 }],
    [{ sortBy: "NAME" }],
    [{ status: "GONE" }],
    [{ color: "rojo" }],
  ])("refuses %o with 400", async (query) => {
    const response = await list(query).expect(400);

    expect((response.body as ErrorResponse).code).toBe("VALIDATION_FAILED");
  });

  it("lets admins in, and asks to log in without a token", async () => {
    await list({}, await tokenFor("ADMIN")).expect(200);
    const response = await list({}, null).expect(401);

    expect((response.body as ErrorResponse).code).toBe("INVALID_ACCESS_TOKEN");
  });
});
