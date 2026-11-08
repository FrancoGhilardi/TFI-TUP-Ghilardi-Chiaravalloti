import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/modules/core/http";

import { createAdminProductsApi } from "./admin-products-api";

const BASE_URL = "http://api.test/api/v1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const product = {
  id: "p1",
  sku: "LMS-000001",
  title: "Cuaderno rayado",
  slug: "cuaderno-rayado",
  price: "1500.00",
  salePrice: null,
  stock: 3,
  isActive: true,
  isFeatured: false,
  isNew: false,
  isOnSale: false,
  primaryCategory: { id: "c1", name: "Cuadernos", slug: "cuadernos" },
  thumbnail: { id: "i1", url: "https://storage.test/p1.webp", altText: null },
  updatedAt: "2026-11-01T12:00:00.000Z",
  deletedAt: null,
};

function setup(respond: () => Response) {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => respond());
  const api = createAdminProductsApi(
    createApiClient({ baseUrl: BASE_URL, getAccessToken: () => "token-abc", fetch: fetchMock }),
  );
  const requestOf = () => fetchMock.mock.calls[0][0] as Request;
  return { api, requestOf };
}

describe("admin products api", () => {
  it("asks only for what it was told to and sends the access token", async () => {
    const { api, requestOf } = setup(() => json({ items: [], totalItems: 0 }));

    await api.list({ status: "ACTIVE", limit: 1 });

    const url = new URL(requestOf().url);
    expect(url.pathname).toBe("/api/v1/admin/products");
    expect(Object.fromEntries(url.searchParams)).toEqual({ status: "ACTIVE", limit: "1" });
    expect(requestOf().headers.get("Authorization")).toBe("Bearer token-abc");
  });

  it("leaves the status out to get the products that are not deleted", async () => {
    const { api, requestOf } = setup(() => json({ items: [], totalItems: 0 }));

    await api.list({ limit: 1 });

    expect(new URL(requestOf().url).searchParams.has("status")).toBe(false);
  });

  it("asks for the lowest stock first", async () => {
    const { api, requestOf } = setup(() => json({ items: [], totalItems: 0 }));

    await api.list({ maxStock: 5, sortBy: "STOCK", sortDir: "ASC", limit: 5 });

    expect(Object.fromEntries(new URL(requestOf().url).searchParams)).toEqual({
      maxStock: "5",
      sortBy: "STOCK",
      sortDir: "ASC",
      limit: "5",
    });
  });

  it("gives the total and the summaries of the page", async () => {
    const { api } = setup(() => json({ items: [product], totalItems: 42 }));

    await expect(api.list({ limit: 6 })).resolves.toEqual({
      total: 42,
      items: [
        {
          id: "p1",
          sku: "LMS-000001",
          title: "Cuaderno rayado",
          stock: 3,
          isActive: true,
          slug: "cuaderno-rayado",
          price: "1500.00",
          salePrice: null,
          isFeatured: false,
          isNew: false,
          isOnSale: false,
          primaryCategory: { id: "c1", name: "Cuadernos" },
          thumbnailUrl: "https://storage.test/p1.webp",
          updatedAt: new Date("2026-11-01T12:00:00.000Z"),
          deletedAt: null,
        },
      ],
    });
  });

  it("has no thumbnail address when the product has no image ready", async () => {
    const { api } = setup(() =>
      json({
        items: [
          { ...product, thumbnail: null },
          { ...product, id: "p2", thumbnail: { id: "i2", url: null, altText: null } },
        ],
        totalItems: 2,
      }),
    );

    const { items } = await api.list({ limit: 2 });

    expect(items.map(({ thumbnailUrl }) => thumbnailUrl)).toEqual([null, null]);
  });

  it("fails on a response of another shape", async () => {
    const { api } = setup(() => json({ items: [{ id: "p1" }], totalItems: 1 }));

    await expect(api.list({ limit: 1 })).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });

  it("fails with the API's error", async () => {
    const { api } = setup(() =>
      json(
        {
          timestamp: "2026-11-01T12:00:00.000Z",
          statusCode: 403,
          code: "FORBIDDEN",
          message: "No tenés permisos.",
          path: "/admin/products",
        },
        403,
      ),
    );

    await expect(api.list({ limit: 1 })).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });
});

describe("admin products api list rows", () => {
  it("keeps the offer price, the marks and the date of a delete", async () => {
    const { api } = setup(() =>
      json({
        items: [
          {
            ...product,
            salePrice: "1200.00",
            isOnSale: true,
            isFeatured: true,
            primaryCategory: null,
            deletedAt: "2026-11-05T09:00:00.000Z",
          },
        ],
        totalItems: 1,
      }),
    );

    const { items } = await api.list({ limit: 20 });

    expect(items[0]).toMatchObject({
      salePrice: "1200.00",
      isOnSale: true,
      isFeatured: true,
      primaryCategory: null,
      deletedAt: new Date("2026-11-05T09:00:00.000Z"),
    });
  });

  it("sends every filter, the sort and the page", async () => {
    const { api, requestOf } = setup(() => json({ items: [], totalItems: 0 }));

    await api.list({
      q: "regla",
      status: "DELETED",
      categoryId: "3f2b8c1e-5a4d-4e6f-9b0a-1c2d3e4f5a6b",
      isFeatured: true,
      isOnSale: true,
      isNew: true,
      maxStock: 0,
      sortBy: "PRICE",
      sortDir: "ASC",
      page: 3,
      limit: 20,
    });

    expect(Object.fromEntries(new URL(requestOf().url).searchParams)).toEqual({
      q: "regla",
      status: "DELETED",
      categoryId: "3f2b8c1e-5a4d-4e6f-9b0a-1c2d3e4f5a6b",
      isFeatured: "true",
      isOnSale: "true",
      isNew: "true",
      maxStock: "0",
      sortBy: "PRICE",
      sortDir: "ASC",
      page: "3",
      limit: "20",
    });
  });
});

describe("admin products api remove and restore", () => {
  function setupAction(respond: () => Response) {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => respond());
    const api = createAdminProductsApi(
      createApiClient({ baseUrl: BASE_URL, getAccessToken: () => "token-abc", fetch: fetchMock }),
    );
    return { api, requestOf: () => fetchMock.mock.calls[0][0] as Request };
  }

  it("deletes with the id in the path and resolves on the empty 204 answer", async () => {
    const { api, requestOf } = setupAction(() => new Response(null, { status: 204 }));

    await expect(api.remove("p1")).resolves.toBeUndefined();

    expect(requestOf().method).toBe("DELETE");
    expect(requestOf().url).toBe(`${BASE_URL}/admin/products/p1`);
    expect(requestOf().headers.get("Authorization")).toBe("Bearer token-abc");
  });

  it("restores with a post to the restore path", async () => {
    const { api, requestOf } = setupAction(() => json({ id: "p1", title: "Cuaderno" }));

    await expect(api.restore("p1")).resolves.toBeUndefined();

    expect(requestOf().method).toBe("POST");
    expect(requestOf().url).toBe(`${BASE_URL}/admin/products/p1/restore`);
  });

  it("fails with the API's message when the product cannot be restored", async () => {
    const { api } = setupAction(() =>
      json(
        {
          timestamp: "2026-11-01T12:00:00.000Z",
          statusCode: 422,
          code: "PRODUCT_WITHOUT_CATEGORY",
          message: "Reactivá alguna de sus categorías primero.",
          path: "/admin/products/p1/restore",
        },
        422,
      ),
    );

    await expect(api.restore("p1")).rejects.toMatchObject({
      status: 422,
      code: "PRODUCT_WITHOUT_CATEGORY",
      message: "Reactivá alguna de sus categorías primero.",
    });
  });

  it("does not mind what the restore answers once it worked", async () => {
    const { api } = setupAction(() => json({ title: "Cuaderno" }));

    await expect(api.restore("p1")).resolves.toBeUndefined();
  });
});
