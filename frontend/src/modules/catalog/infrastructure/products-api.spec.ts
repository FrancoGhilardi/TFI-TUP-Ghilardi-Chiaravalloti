import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "@/modules/core/http";

import {
  getAllProductSlugs,
  getFeaturedProducts,
  getNewProducts,
  searchProducts,
} from "./products-api";

vi.mock("@/modules/core/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/core/http")>()),
  apiClient: { get: vi.fn() },
}));

const STORAGE_IMAGE = "http://127.0.0.1:54321/storage/v1/object/public/product-images/p1.webp";

const dto = (overrides: Record<string, unknown> = {}) => ({
  id: "p1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  price: "9800.00",
  salePrice: null,
  stock: 5,
  isOnSale: false,
  isNew: true,
  isFeatured: false,
  image: {
    id: "i1",
    position: 1,
    url: STORAGE_IMAGE,
    altText: "Tapa del cuaderno",
    width: 1200,
    height: 1500,
  },
  category: { id: "c1", name: "Cuadernos", slug: "cuadernos" },
  ...overrides,
});

describe("products API", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it.each([
    ["featured", getFeaturedProducts, "/products/featured"],
    ["new", getNewProducts, "/products/new"],
  ])(
    "reads the %s products with revalidation and the caller's timeout",
    async (_name, read, path) => {
      vi.mocked(apiClient.get).mockResolvedValue([]);

      await read(3000);

      expect(apiClient.get).toHaveBeenCalledWith(path, {
        next: { revalidate: 60 },
        timeoutMs: 3000,
      });
    },
  );

  it("maps each card", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([dto({ isOnSale: true, salePrice: "8000.00" })]);

    await expect(getNewProducts()).resolves.toEqual([
      {
        id: "p1",
        slug: "cuaderno-a4",
        title: "Cuaderno A4",
        price: "9800.00",
        salePrice: "8000.00",
        stock: 5,
        isOnSale: true,
        isNew: true,
        isFeatured: false,
        image: { url: STORAGE_IMAGE, alt: "Tapa del cuaderno", optimizable: true },
        category: { name: "Cuadernos", slug: "cuadernos" },
      },
    ]);
  });

  it.each([null, "", "   "])(
    "uses the title when the image text alternative is %j",
    async (altText) => {
      vi.mocked(apiClient.get).mockResolvedValue([dto({ image: { ...dto().image, altText } })]);

      const [card] = await getFeaturedProducts();

      expect(card.image.alt).toBe("Cuaderno A4");
    },
  );

  it("marks an image outside the configured Storage as not optimizable", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([
      dto({
        image: { ...dto().image, url: "http://localhost:54321/storage/v1/object/public/x.webp" },
      }),
    ]);

    const [card] = await getFeaturedProducts();

    expect(card.image.optimizable).toBe(false);
  });

  it.each([
    ["a paged object", { items: [] }],
    ["a card without image", [dto({ image: null })]],
    ["a malformed price", [dto({ price: "1.500,50" })]],
  ])("reports %s as an unexpected response", async (_name, body) => {
    vi.mocked(apiClient.get).mockResolvedValue(body);

    await expect(getNewProducts()).rejects.toBeInstanceOf(ApiError);
  });

  it("keeps a hidden category as null", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([dto({ category: null })]);

    const [card] = await getFeaturedProducts();

    expect(card.category).toBeNull();
  });

  it("reads a catalog page with the query parameters and maps its cards", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [dto()],
      page: 2,
      limit: 20,
      totalItems: 21,
      totalPages: 2,
    });
    const params = { q: "lapiz", sort: "RELEVANCE", page: 2, limit: 20 } as const;

    const page = await searchProducts(params);

    expect(apiClient.get).toHaveBeenCalledWith("/products", {
      query: params,
      next: { revalidate: 60 },
    });
    expect(page).toMatchObject({ page: 2, totalItems: 21, totalPages: 2 });
    expect(page.items[0]).toMatchObject({ slug: "cuaderno-a4", image: { optimizable: true } });
  });

  it("reports a catalog page of another shape as an unexpected response", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([dto()]);

    await expect(searchProducts({ sort: "RELEVANCE", page: 1, limit: 20 })).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

describe("getAllProductSlugs", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  const page = (slugs: string[], totalPages: number) => ({
    items: slugs.map((slug) => ({ slug, title: slug })),
    page: 1,
    limit: 50,
    totalItems: 0,
    totalPages,
  });

  it("reads every page of the catalog in turn, 50 at a time, and joins the slugs", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce(page(["a", "b"], 3))
      .mockResolvedValueOnce(page(["c"], 3))
      .mockResolvedValueOnce(page(["d"], 3));

    await expect(getAllProductSlugs()).resolves.toEqual(["a", "b", "c", "d"]);

    expect(apiClient.get).toHaveBeenCalledTimes(3);
    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/products", {
      query: { page: 1, limit: 50 },
      next: { revalidate: 60 },
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(3, "/products", {
      query: { page: 3, limit: 50 },
      next: { revalidate: 60 },
    });
  });

  it("gives an empty list for an empty catalog", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(page([], 0));

    await expect(getAllProductSlugs()).resolves.toEqual([]);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it("stops at the last page the API accepts", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(page(["a"], 900));

    await getAllProductSlugs();

    expect(apiClient.get).toHaveBeenCalledTimes(500);
  });

  it("fails on a response of another shape", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ items: "nope" });

    await expect(getAllProductSlugs()).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });

  it("lets an API failure through", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      new ApiError({ status: 503, code: "UNAVAILABLE", message: "down" }),
    );

    await expect(getAllProductSlugs()).rejects.toBeInstanceOf(ApiError);
  });
});
