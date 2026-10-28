import type {
  AdminProductDetailResult,
  AdminProductImageResult,
} from "../dto/admin-product-detail.result.js";

/** Reads products for the admin panel, without loading entities. */
export abstract class AdminProductQueries {
  /** The product with that id, deleted or not, or `null`. */
  abstract findById(id: string): Promise<AdminProductDetailResult | null>;

  /** The image with that id, as the product detail shows it, or `null`. */
  abstract findImageById(id: string): Promise<AdminProductImageResult | null>;

  /** The product's images as its detail shows them, by position. */
  abstract findImagesByProduct(productId: string): Promise<AdminProductImageResult[]>;
}
