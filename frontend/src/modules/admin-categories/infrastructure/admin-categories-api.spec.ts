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
