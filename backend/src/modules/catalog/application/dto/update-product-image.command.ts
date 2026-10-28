/** A new alt text for an image; blank removes it. */
export interface UpdateProductImageCommand {
  productId: string;
  imageId: string;
  altText: string;
}
