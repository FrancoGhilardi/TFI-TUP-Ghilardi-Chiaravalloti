import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, type Page } from "@/modules/core/http";

import { EMPTY_CATALOG_QUERY, parseCatalogQuery } from "../domain/catalog-query";
import type { ProductCard } from "../domain/product-card";
import { searchProducts } from "../infrastructure/products-api";
import { getCatalogPage } from "./get-catalog-page";

vi.mock("../infrastructure/products-api", () => ({ searchProducts: vi.fn() }));

const apiFailure = new ApiError({ status: 0, code: "TIMEOUT", message: "Tardó demasiado." });
const page: Page<ProductCard> = { items: [], page: 1, limit: 20, totalItems: 0, totalPages: 0 };

beforeEach(() => {
  vi.mocked(searchProducts).mockReset();
});

describe("getCatalogPage", () => {
  it("asks the API for the query and returns the page", async () => {
    vi.mocked(searchProducts).mockResolvedValue(page);

    const result = await getCatalogPage(parseCatalogQuery({ q: "lapiz", pagina: "2" }));

    expect(result).toEqual({ status: "ok", page });
    expect(searchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ q: "lapiz", page: 2, limit: 20 }),
    );
  });

  it("reports an API failure as an error result", async () => {
    vi.mocked(searchProducts).mockRejectedValue(apiFailure);

    await expect(getCatalogPage(EMPTY_CATALOG_QUERY)).resolves.toEqual({ status: "error" });
  });

  it("lets any other error through", async () => {
    const bug = new TypeError("boom");
    vi.mocked(searchProducts).mockRejectedValue(bug);

    await expect(getCatalogPage(EMPTY_CATALOG_QUERY)).rejects.toBe(bug);
  });
});
