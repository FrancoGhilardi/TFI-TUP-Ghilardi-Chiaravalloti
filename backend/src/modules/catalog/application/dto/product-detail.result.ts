import type { CategorySummaryResult } from "./admin-category.result.js";
import type { ProductCardResult, ProductImageResult } from "./product-card.result.js";

/**
 * The page of a product in the store: only its processed images and the categories the store
 * shows. Like the cards, a sale or a "new" mark that ended does not count.
 */
export interface ProductDetailResult {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: string;
  salePrice: string | null;
  isOnSale: boolean;
  /** When the running sale ends, if it has an end. */
  saleEndsAt: Date | null;
  stock: number;
  isFeatured: boolean;
  isNew: boolean;
  images: ProductImageResult[];
  /** `null` while the primary category is hidden from the store. */
  primaryCategory: CategorySummaryResult | null;
  categories: CategorySummaryResult[];
  relatedProducts: ProductCardResult[];
}

/** The product page as read, before its related products are added. */
export type ProductPage = Omit<ProductDetailResult, "relatedProducts">;
