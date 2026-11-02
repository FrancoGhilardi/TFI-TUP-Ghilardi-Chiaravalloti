import type { ProductImageMimeType } from "../../domain/entities/product-image.js";

const EXTENSIONS: Record<ProductImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** The one place that names the stored files of the product images. */
export class ImageKeyFactory {
  /** The uploaded file, in the private storage: `products/{productId}/{imageId}.{ext}`. */
  originalKey(productId: string, imageId: string, mimeType: ProductImageMimeType): string {
    return `products/${productId}/${imageId}.${EXTENSIONS[mimeType]}`;
  }

  /**
   * A file that replaces the original of an image, under its own `version` since no file is
   * ever overwritten: `products/{productId}/{imageId}-{version}.{ext}`.
   */
  replacementOriginalKey(
    productId: string,
    imageId: string,
    mimeType: ProductImageMimeType,
    version: string,
  ): string {
    return `products/${productId}/${imageId}-${version}.${EXTENSIONS[mimeType]}`;
  }

  /**
   * The public version, in the public storage: `products/{productId}/{imageId}-v{version}.webp`.
   * Each processing names a new version, so no cache keeps showing the one it replaced and no
   * run ever touches another's file.
   */
  publicKey(productId: string, imageId: string, version: string): string {
    return `products/${productId}/${imageId}-v${version}.webp`;
  }
}
