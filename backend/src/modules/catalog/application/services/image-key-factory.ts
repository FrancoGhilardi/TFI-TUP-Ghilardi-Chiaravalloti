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
}
