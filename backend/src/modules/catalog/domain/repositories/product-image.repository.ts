import type { ProductImage } from "../entities/product-image.js";

/** Loads and stores the images of the products. */
export abstract class ProductImageRepository {
  /** Stores new images, or the changes of existing ones, in one go. */
  abstract saveAll(images: ProductImage[]): Promise<void>;

  /** How many images the product has, in any state. */
  abstract countByProduct(productId: string): Promise<number>;
}
