import type { ProductImage } from "../entities/product-image.js";

/** Loads and stores the images of the products. */
export abstract class ProductImageRepository {
  /** Stores new images, or the changes of existing ones, in one go. */
  abstract saveAll(images: ProductImage[]): Promise<void>;

  /** The image with that id, or `null`. Inside a transaction it is locked. */
  abstract findById(id: string): Promise<ProductImage | null>;

  /** The product's images, by position. Inside a transaction they are locked. */
  abstract findByProduct(productId: string): Promise<ProductImage[]>;

  /** How many images the product has, in any state. */
  abstract countByProduct(productId: string): Promise<number>;
}
