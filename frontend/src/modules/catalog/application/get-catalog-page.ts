import { ApiError, type Page } from "@/modules/core/http";

import { type CatalogQuery, toApiParams } from "../domain/catalog-query";
import type { ProductCard } from "../domain/product-card";
import { searchProducts } from "../infrastructure/products-api";

export type CatalogPageResult =
  | { status: "ok"; page: Page<ProductCard> }
  /** The products could not be read; the page shows a retry instead of an empty result. */
  | { status: "error" };

/** The products are the page's content, so a failure is reported, not hidden. */
export async function getCatalogPage(query: CatalogQuery): Promise<CatalogPageResult> {
  try {
    return { status: "ok", page: await searchProducts(toApiParams(query)) };
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error" };
    }
    throw error;
  }
}
