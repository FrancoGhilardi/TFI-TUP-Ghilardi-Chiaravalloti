import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFeaturedProducts, getNewProducts, type ProductCard } from "@/modules/catalog";
import { ApiError } from "@/modules/core/http";

import { getHomeFeatured, getHomeNewArrivals } from "./get-home-content";

vi.mock("@/modules/catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/catalog")>()),
  getFeaturedProducts: vi.fn(),
  getNewProducts: vi.fn(),
}));

const apiFailure = new ApiError({ status: 0, code: "TIMEOUT", message: "Tardó demasiado." });
const card = { id: "p1", slug: "cuaderno" } as ProductCard;

beforeEach(() => {
  vi.mocked(getFeaturedProducts).mockReset();
  vi.mocked(getNewProducts).mockReset();
});

describe.each([
  ["getHomeFeatured", getHomeFeatured, getFeaturedProducts],
  ["getHomeNewArrivals", getHomeNewArrivals, getNewProducts],
])("%s", (_name, read, source) => {
  it("returns the products, waiting a short time", async () => {
    vi.mocked(source).mockResolvedValue([card]);

    await expect(read()).resolves.toEqual([card]);
    expect(source).toHaveBeenCalledWith(3000);
  });

  it("returns no products when the API fails", async () => {
    vi.mocked(source).mockRejectedValue(apiFailure);

    await expect(read()).resolves.toEqual([]);
  });
});
