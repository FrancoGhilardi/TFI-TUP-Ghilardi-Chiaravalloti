import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/modules/core/http";

import { createAdminCategoriesApi } from "./admin-categories-api";

const BASE_URL = "http://api.test/api/v1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const errorBody = (statusCode: number, code: string, message: string, details?: unknown) => ({
  timestamp: "2026-11-01T12:00:00.000Z",
  statusCode,
  code,
  message,
  details,
  path: "/admin/categories",
});

const row = {
  id: "c1",
  name: "Cuadernos",
  slug: "cuadernos",
  description: null,
  parent: { id: "c0", name: "Librería", slug: "libreria" },
  sortOrder: 2,
  isActive: true,
  depth: 1,
  productCount: 7,
  createdAt: "2026-01-02T12:00:00.000Z",
  updatedAt: "2026-11-02T12:00:00.000Z",
  deletedAt: null,
};

function setup(respond: () => Response) {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => respond());
  const api = createAdminCategoriesApi(
    createApiClient({ baseUrl: BASE_URL, getAccessToken: () => "token-abc", fetch: fetchMock }),
  );
  return { api, requestOf: () => fetchMock.mock.calls[0][0] as Request };
}

describe("admin categories api list", () => {
  it("sends only the parameters it is given, with the access token", async () => {
    const { api, requestOf } = setup(() => json({ items: [], totalItems: 0 }));

    await api.list({ q: "libros", status: "DELETED", parentId: "c0", page: 2, limit: 50 });

    const url = new URL(requestOf().url);
    expect(url.pathname).toBe("/api/v1/admin/categories");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "libros",
      status: "DELETED",
      parentId: "c0",
      page: "2",
      limit: "50",
    });
    expect(requestOf().headers.get("Authorization")).toBe("Bearer token-abc");
  });

  it("leaves the status out to get the categories that are not deleted", async () => {
    const { api, requestOf } = setup(() => json({ items: [], totalItems: 0 }));

    await api.list({ page: 1, limit: 50 });

    expect(new URL(requestOf().url).searchParams.has("status")).toBe(false);
  });

  it("gives the total and the rows, with their dates read", async () => {
    const { api } = setup(() =>
      json({
        items: [
          row,
          {
            ...row,
            id: "c2",
            parent: null,
            description: "Escolares",
            deletedAt: "2026-11-05T09:00:00.000Z",
          },
        ],
        totalItems: 42,
      }),
    );

    const { total, items } = await api.list({ limit: 50 });

    expect(total).toBe(42);
    expect(items[0]).toMatchObject({
      id: "c1",
      description: null,
      parent: { id: "c0", name: "Librería", slug: "libreria" },
      depth: 1,
      productCount: 7,
      createdAt: new Date("2026-01-02T12:00:00.000Z"),
      deletedAt: null,
    });
    expect(items[1]).toMatchObject({
      parent: null,
      description: "Escolares",
      deletedAt: new Date("2026-11-05T09:00:00.000Z"),
    });
  });

  it("fails on a response of another shape", async () => {
    const { api } = setup(() => json({ items: [{ id: "c1" }], totalItems: 1 }));

    await expect(api.list({ limit: 50 })).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });
});

describe("admin categories api get", () => {
  it("reads a category, also a deleted one", async () => {
    const { api, requestOf } = setup(() => json({ ...row, deletedAt: "2026-11-05T09:00:00.000Z" }));

    const category = await api.get("c1");

    expect(requestOf().url).toBe(`${BASE_URL}/admin/categories/c1`);
    expect(category.deletedAt).toEqual(new Date("2026-11-05T09:00:00.000Z"));
  });

  it("fails with the API's not-found error", async () => {
    const { api } = setup(() =>
      json(errorBody(404, "CATEGORY_NOT_FOUND", "No encontramos esa categoría."), 404),
    );

    await expect(api.get("c1")).rejects.toMatchObject({ status: 404, code: "CATEGORY_NOT_FOUND" });
  });

  it("fails on a response of another shape", async () => {
    const { api } = setup(() => json({ ...row, parent: "c0" }));

    await expect(api.get("c1")).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });
});

describe("admin categories api create and update", () => {
  it("creates with the request as JSON and does not read the answer", async () => {
    const { api, requestOf } = setup(() => json({ created: true }, 201));

    await expect(
      api.create({ name: "Cuadernos", parentId: "c0", sortOrder: 2, isActive: true }),
    ).resolves.toBeUndefined();

    expect(requestOf().method).toBe("POST");
    expect(requestOf().url).toBe(`${BASE_URL}/admin/categories`);
    expect(await requestOf().json()).toEqual({
      name: "Cuadernos",
      parentId: "c0",
      sortOrder: 2,
      isActive: true,
    });
  });

  it("patches only what it is given, with null to move to the root", async () => {
    const { api, requestOf } = setup(() => json(row));

    await expect(api.update("c1", { parentId: null, description: "" })).resolves.toBeUndefined();

    expect(requestOf().method).toBe("PATCH");
    expect(requestOf().url).toBe(`${BASE_URL}/admin/categories/c1`);
    expect(await requestOf().json()).toEqual({ parentId: null, description: "" });
  });

  it("fails with a refusal, keeping its code and the field it names", async () => {
    const { api } = setup(() =>
      json(
        errorBody(400, "VALIDATION_FAILED", "Revisá los datos.", [
          { field: "name", messages: ["El nombre es obligatorio."] },
        ]),
        400,
      ),
    );

    const failure = await api.update("c1", { name: "" }).catch((error: unknown) => error);

    expect(failure).toMatchObject({ status: 400, code: "VALIDATION_FAILED" });
    expect((failure as { fieldErrors: () => unknown }).fieldErrors()).toEqual({
      name: ["El nombre es obligatorio."],
    });
  });

  it("fails with the API's cycle error", async () => {
    const { api } = setup(() =>
      json(
        errorBody(422, "CATEGORY_CYCLE", "Una categoría no puede quedar dentro de sí misma."),
        422,
      ),
    );

    await expect(api.update("c1", { parentId: "c2" })).rejects.toMatchObject({
      status: 422,
      code: "CATEGORY_CYCLE",
    });
  });
});

describe("admin categories api remove and restore", () => {
  it("deletes with the id in the path and resolves on the empty 204 answer", async () => {
    const { api, requestOf } = setup(() => new Response(null, { status: 204 }));

    await expect(api.remove("c1")).resolves.toBeUndefined();

    expect(requestOf().method).toBe("DELETE");
    expect(requestOf().url).toBe(`${BASE_URL}/admin/categories/c1`);
  });

  it("keeps how many block a delete the API refuses", async () => {
    const { api } = setup(() =>
      json(
        errorBody(422, "CATEGORY_HAS_ACTIVE_CHILDREN", "Tiene subcategorías.", { count: 3 }),
        422,
      ),
    );

    await expect(api.remove("c1")).rejects.toMatchObject({
      status: 422,
      code: "CATEGORY_HAS_ACTIVE_CHILDREN",
      details: { count: 3 },
    });
  });

  it("restores with a post to the restore path, not reading the answer", async () => {
    const { api, requestOf } = setup(() => json({ cualquier: "cosa" }));

    await expect(api.restore("c1")).resolves.toBeUndefined();

    expect(requestOf().method).toBe("POST");
    expect(requestOf().url).toBe(`${BASE_URL}/admin/categories/c1/restore`);
  });

  it("fails with the API's refusal to restore", async () => {
    const { api } = setup(() =>
      json(errorBody(409, "CATEGORY_NAME_IN_USE", "Ese nombre ya lo usa otra categoría."), 409),
    );

    await expect(api.restore("c1")).rejects.toMatchObject({
      status: 409,
      code: "CATEGORY_NAME_IN_USE",
    });
  });
});
