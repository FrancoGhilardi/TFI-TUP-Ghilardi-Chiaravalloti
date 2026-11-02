import type { Page } from "@/modules/core/http";

import type { ProductCard } from "../domain/product-card";
import type { CatalogPageResult } from "./get-catalog-page";

export type CatalogView =
  | { kind: "error" }
  /** Nothing matches the filters. */
  | { kind: "empty" }
  /** Products match, but the requested page is past the last one. */
  | { kind: "outOfRange" }
  | { kind: "results"; page: Page<ProductCard> };

/** What the catalog shows for a result: a state or the products. */
export function catalogView(result: CatalogPageResult): CatalogView {
  if (result.status === "error") {
    return { kind: "error" };
  }
  const { page } = result;
  if (page.totalItems === 0) {
    return { kind: "empty" };
  }
  if (page.items.length === 0) {
    return { kind: "outOfRange" };
  }
  return { kind: "results", page };
}
