import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "@/modules/core/http";

import { getProductPage } from "../application/get-product-page";
import { getProductDetail } from "./product-detail-api";

vi.mock("@/modules/core/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/core/http")>()),
  apiClient: { get: vi.fn() },
}));

const STORAGE = "http://127.0.0.1:54321/storage/v1/object/public/product-images";

const card = {
  id: "p2",
  slug: "lapiz",
  title: "Lápiz",
  price: "450.00",
  salePrice: null,
  stock: 5,
  isOnSale: false,
  isNew: false,
  isFeatured: false,
  image: { url: `${STORAGE}/p2.webp`, altText: null },
  category: null,
};

const dto = (overrides: Record<string, unknown> = {}) => ({
  id: "p1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  description: "  Tapa dura.  ",
  price: "9800.00",
  salePrice: "8000.00",
  isOnSale: true,
  saleEndsAt: null,
  stock: 4,
  isFeatured: false,
  isNew: false,
  images: [
    { id: "i1", position: 1, url: `${STORAGE}/p1.webp`, altText: "Tapa", width: 480, height: 600 },
    {
      id: "i2",
      position: 2,
      url: "http://other/p1b.webp",
      altText: " ",
      width: null,
      height: null,
    },
  ],
  primaryCategory: { id: "c1", name: "Cuadernos", slug: "cuadernos" },
  categories: [{ id: "c1", name: "Cuadernos", slug: "cuadernos" }],
  relatedProducts: [card],
  ...overrides,
});

const notFound = () =>
  new ApiError({ status: 404, code: "PRODUCT_NOT_FOUND", message: "No encontramos el producto." });

describe("getProductDetail", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("reads the product by its encoded slug with revalidation", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(dto());

    await getProductDetail("café/1");

    expect(apiClient.get).toHaveBeenCalledWith("/products/caf%C3%A9%2F1", {
      next: { revalidate: 60 },
    });
  });

  it("maps the product: trimmed description, image text and optimizer flag, category and related", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(dto());

    const product = await getProductDetail("cuaderno-a4-map");

    expect(product).toMatchObject({
      id: "p1",
      description: "Tapa dura.",
      price: "9800.00",
      salePrice: "8000.00",
      isOnSale: true,
      stock: 4,
      category: { name: "Cuadernos", slug: "cuadernos" },
    });
    expect(product.images).toEqual([
      { id: "i1", url: `${STORAGE}/p1.webp`, alt: "Tapa", optimizable: true },
      { id: "i2", url: "http://other/p1b.webp", alt: "Cuaderno A4", optimizable: false },
    ]);
    expect(product.related).toHaveLength(1);
    expect(product.related[0]).toMatchObject({ slug: "lapiz", image: { alt: "Lápiz" } });
  });

  it.each([
    ["no description", { description: null }, null],
    ["a blank description", { description: "   " }, null],
  ])("keeps %s as null", async (_name, overrides, expected) => {
    vi.mocked(apiClient.get).mockResolvedValue(dto(overrides));

    expect((await getProductDetail(`d-${_name}`)).description).toBe(expected);
  });

  it("keeps a hidden primary category as null", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(dto({ primaryCategory: null }));

    expect((await getProductDetail("sin-categoria")).category).toBeNull();
  });

  it.each([
    ["no images", { images: [] }],
    ["a negative stock", { stock: -1 }],
    ["a malformed price", { price: "9.800,00" }],
    ["a related card without image", { relatedProducts: [{ ...card, image: null }] }],
  ])("reports %s as an unexpected response", async (name, overrides) => {
    vi.mocked(apiClient.get).mockResolvedValue(dto(overrides));

    await expect(getProductDetail(`bad-${name}`)).rejects.toBeInstanceOf(ApiError);
  });
});

describe("getProductPage", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("returns the product when the API has it", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(dto());

    const result = await getProductPage("page-ok");

    expect(result.status).toBe("ok");
  });

  it("turns a 404 into a not-found result", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(notFound());

    await expect(getProductPage("page-missing")).resolves.toEqual({ status: "not-found" });
  });

  it.each([
    ["a server error", new ApiError({ status: 500, code: "INTERNAL_ERROR", message: "Error" })],
    ["a network failure", new ApiError({ status: 0, code: "NETWORK_ERROR", message: "Sin red" })],
    ["a bug", new TypeError("boom")],
  ])("rethrows %s for the error page", async (name, failure) => {
    vi.mocked(apiClient.get).mockRejectedValue(failure);

    await expect(getProductPage(`page-${name}`)).rejects.toBe(failure);
  });
});
