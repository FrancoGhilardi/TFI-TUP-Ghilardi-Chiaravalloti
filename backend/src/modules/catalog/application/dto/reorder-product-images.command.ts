/** The product's images in their new order, from the first one. */
export interface ReorderProductImagesCommand {
  productId: string;
  imageIds: string[];
}
