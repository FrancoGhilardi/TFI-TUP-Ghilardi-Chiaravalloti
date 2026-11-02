import type { ImageUploadInput } from "./create-product.command.js";

/** One more image for an existing product. */
export interface AddProductImageCommand {
  productId: string;
  image: ImageUploadInput;
}
