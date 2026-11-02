import type { CategorySummaryResult } from "./admin-category.result.js";

/**
 * The first image of a product: its public version or, while it has none, a temporary link
 * to its original; `null` when the storage could not sign it.
 */
export interface AdminProductThumbnailResult {
  id: string;
  url: string | null;
  altText: string | null;
}

/**
 * A row of the panel's product list. Amounts are decimal text; the sale and the "new" mark
 * are the ones running now, and what the product does not have is `null`.
 */
export interface AdminProductListItemResult {
  id: string;
  sku: string;
  title: string;
  slug: string;
  price: string;
  salePrice: string | null;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
  primaryCategory: CategorySummaryResult | null;
  thumbnail: AdminProductThumbnailResult | null;
  updatedAt: Date;
  deletedAt: Date | null;
}
