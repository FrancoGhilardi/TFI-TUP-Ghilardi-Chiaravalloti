import type { CategorySummaryResult } from "./admin-category.result.js";
import type { ProductCardResult } from "./product-card.result.js";

/** The visible products and categories that match, each up to the limit asked. */
export interface GlobalSearchResult {
  products: ProductCardResult[];
  categories: CategorySummaryResult[];
}
