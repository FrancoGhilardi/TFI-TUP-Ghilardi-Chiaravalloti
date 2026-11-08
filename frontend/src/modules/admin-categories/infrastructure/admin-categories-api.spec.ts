import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/modules/core/http";

import { createAdminCategoriesApi } from "./admin-categories-api";

const BASE_URL = "http://api.test/api/v1";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

function setup(body: unknown) {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => json(body));
  const api = createAdminCategoriesApi(
    createApiClient({ baseUrl: BASE_URL, getAccessToken: () => "token-abc", fetch: fetchMock }),
  );
  return { api, requestOf: () => fetchMock.mock.calls[0][0] as Request };
}

describe("admin categories api", () => {
  it("counts with a page of one and the status asked for", async () => {
    const { api, requestOf } = setup({ items: [], totalItems: 7 });

    await expect(api.count("ACTIVE")).resolves.toBe(7);

    const url = new URL(requestOf().url);
    expect(url.pathname).toBe("/api/v1/admin/categories");
    expect(Object.fromEntries(url.searchParams)).toEqual({ status: "ACTIVE", limit: "1" });
    expect(requestOf().headers.get("Authorization")).toBe("Bearer token-abc");
  });

  it("leaves the status out to count the ones that are not deleted", async () => {
    const { api, requestOf } = setup({ items: [], totalItems: 9 });

    await api.count();

    expect(new URL(requestOf().url).searchParams.has("status")).toBe(false);
  });

  it("fails on a response without a total", async () => {
    const { api } = setup({ items: [] });

    await expect(api.count()).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });
});

describe("admin categories api listAll", () => {
  const category = (id: string, name: string, depth = 0, isActive = true) => ({
    id,
    name,
    depth,
    isActive,
    slug: name.toLowerCase(),
  });

  function setupPages(pages: unknown[]) {
    const fetchMock = vi.fn<typeof fetch>();
    for (const page of pages) {
      fetchMock.mockImplementationOnce(async () => json(page));
    }
    const api = createAdminCategoriesApi(
      createApiClient({ baseUrl: BASE_URL, getAccessToken: () => "token-abc", fetch: fetchMock }),
    );
    return { api, fetchMock };
  }

  it("reads every page, in the order the API gives, with the level of each category", async () => {
    const { api, fetchMock } = setupPages([
      { items: [category("c1", "Libros"), category("c2", "Novelas", 1)], totalPages: 2 },
      { items: [category("c3", "Útiles", 0, false)], totalPages: 2 },
    ]);

    const options = await api.listAll();

    expect(options.map(({ id }) => id)).toEqual(["c1", "c2", "c3"]);
    expect(options[1].label).toBe(" Novelas");
    expect(options[2].label).toBe("Útiles (inactiva)");
    const pages = fetchMock.mock.calls.map(([request]) =>
      Object.fromEntries(new URL((request as Request).url).searchParams),
    );
    expect(pages).toEqual([
      { page: "1", limit: "100" },
      { page: "2", limit: "100" },
    ]);
  });

  it("stops at the last page", async () => {
    const { api, fetchMock } = setupPages([{ items: [category("c1", "Libros")], totalPages: 1 }]);

    await api.listAll();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops after the pages it allows itself, so a huge catalog cannot keep it reading", async () => {
    const page = { items: [category("c1", "Libros")], totalPages: 500 };
    const { api, fetchMock } = setupPages(Array.from({ length: 25 }, () => page));

    await api.listAll();

    expect(fetchMock).toHaveBeenCalledTimes(20);
  });

  it("fails on a response of another shape", async () => {
    const { api } = setupPages([{ items: [{ id: "c1" }], totalPages: 1 }]);

    await expect(api.listAll()).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });
});
