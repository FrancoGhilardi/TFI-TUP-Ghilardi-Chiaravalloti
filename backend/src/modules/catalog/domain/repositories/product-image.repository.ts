import type { ProductImage } from "../entities/product-image.js";

/** Loads and stores the images of the products. */
export abstract class ProductImageRepository {
  /** Stores new images, or the changes of existing ones, in one go. */
  abstract saveAll(images: ProductImage[]): Promise<void>;

  /** The image with that id, or `null`. Inside a transaction it is locked. */
  abstract findById(id: string): Promise<ProductImage | null>;

  /** How many images the product has, in any state. */
  abstract countByProduct(productId: string): Promise<number>;
}
