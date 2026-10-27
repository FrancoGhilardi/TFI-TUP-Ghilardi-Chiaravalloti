import type { CategorySummaryResult } from "./admin-category.result.js";

/** A processed image as the store shows it, from the public storage. */
export interface ProductImageResult {
  id: string;
  position: number;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

/**
 * A product in a store listing. Amounts are decimal text with two decimals. The sale and the
 * "new" mark count only while they run, so `salePrice` is `null` once a sale ends.
 */
export interface ProductCardResult {
  id: string;
  slug: string;
  title: string;
  price: string;
  salePrice: string | null;
  isOnSale: boolean;
  isNew: boolean;
  isFeatured: boolean;
  /** The first processed image. */
  image: ProductImageResult;
  /** The primary category, or `null` while it is hidden from the store. */
  category: CategorySummaryResult | null;
}
