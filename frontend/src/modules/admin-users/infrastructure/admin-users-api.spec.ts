import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/modules/core/http";

import { createAdminUsersApi } from "./admin-users-api";

const BASE_URL = "http://api.test/api/v1";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

function setup(body: unknown) {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => json(body));
  const api = createAdminUsersApi(
    createApiClient({ baseUrl: BASE_URL, getAccessToken: () => "token-abc", fetch: fetchMock }),
  );
  return { api, requestOf: () => fetchMock.mock.calls[0][0] as Request };
}

describe("admin users api", () => {
  it("counts with a page of one and sends the access token", async () => {
    const { api, requestOf } = setup({ items: [], totalItems: 4 });

    await expect(api.count()).resolves.toBe(4);

    const url = new URL(requestOf().url);
    expect(url.pathname).toBe("/api/v1/admin/users");
    expect(Object.fromEntries(url.searchParams)).toEqual({ limit: "1" });
    expect(requestOf().headers.get("Authorization")).toBe("Bearer token-abc");
  });

  it("fails on a response without a total", async () => {
    const { api } = setup({ items: [] });

    await expect(api.count()).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });
});
