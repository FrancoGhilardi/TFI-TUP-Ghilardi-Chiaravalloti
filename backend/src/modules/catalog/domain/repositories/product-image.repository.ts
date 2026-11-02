import type { ProductImage } from "../entities/product-image.js";

/** Loads and stores the images of the products. */
export abstract class ProductImageRepository {
  /** Stores new images, or the changes of existing ones, in one go. */
  abstract saveAll(images: ProductImage[]): Promise<void>;

  /** The image with that id, or `null`. Inside a transaction it is locked. */
  abstract findById(id: string): Promise<ProductImage | null>;

  /** The product's images, by position. Inside a transaction they are locked. */
  abstract findByProduct(productId: string): Promise<ProductImage[]>;

  /** Removing an image that is not there is not a failure. */
  abstract delete(id: string): Promise<void>;

  /**
   * The images pending since `pendingBefore` or earlier, the oldest first, up to `limit`: those
   * whose processing stalled.
   */
  abstract findStalePendingIds(pendingBefore: Date, limit: number): Promise<string[]>;

  /** How many images the product has, in any state. */
  abstract countByProduct(productId: string): Promise<number>;
}
