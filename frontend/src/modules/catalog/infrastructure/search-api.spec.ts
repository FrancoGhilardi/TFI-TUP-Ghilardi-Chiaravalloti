import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "@/modules/core/http";

import { searchStore } from "./search-api";

vi.mock("@/modules/core/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/core/http")>()),
  apiClient: { get: vi.fn() },
}));

const card = {
  id: "p1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  price: "9800.00",
  salePrice: null,
  stock: 5,
  isOnSale: false,
  isNew: false,
  isFeatured: false,
  image: {
    url: "http://127.0.0.1:54321/storage/v1/object/public/product-images/p1.webp",
    altText: null,
  },
  category: null,
};

describe("searchStore", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("asks for 5 of each group with the term and the caller's signal", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ products: [], categories: [] });
    const { signal } = new AbortController();

    await searchStore("cuaderno", signal);

    expect(apiClient.get).toHaveBeenCalledWith("/search", {
      query: { q: "cuaderno", limit: 5 },
      signal,
    });
  });

  it("maps the product cards and keeps the categories", async () => {
    const category = { id: "c1", name: "Cuadernos", slug: "cuadernos" };
    vi.mocked(apiClient.get).mockResolvedValue({ products: [card], categories: [category] });

    const result = await searchStore("cuaderno");

    expect(result.categories).toEqual([category]);
    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      slug: "cuaderno-a4",
      image: { alt: "Cuaderno A4", optimizable: true },
    });
  });

  it.each([
    ["an array", []],
    ["missing categories", { products: [] }],
    ["a malformed price", { products: [{ ...card, price: "9.800,00" }], categories: [] }],
  ])("reports %s as an unexpected response", async (_name, body) => {
    vi.mocked(apiClient.get).mockResolvedValue(body);

    await expect(searchStore("cuaderno")).rejects.toBeInstanceOf(ApiError);
  });

  it("lets an API failure through", async () => {
    const failure = new ApiError({
      status: 429,
      code: "TOO_MANY_REQUESTS",
      message: "Hiciste demasiados intentos.",
    });
    vi.mocked(apiClient.get).mockRejectedValue(failure);

    await expect(searchStore("cuaderno")).rejects.toBe(failure);
  });
});
