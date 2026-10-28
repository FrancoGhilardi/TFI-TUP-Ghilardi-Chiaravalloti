import type { ProductImage } from "../../domain/entities/product-image.js";
import type { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import type { AdminProductImageResult } from "../dto/admin-product-detail.result.js";
import { ProductImageNotFoundError } from "../errors/product-image-not-found-error.js";
import type { AdminProductQueries } from "../ports/admin-product-queries.js";

/** The product's image; one of another product is as unknown. Locked inside a transaction. */
export async function loadProductImage(
  images: ProductImageRepository,
  productId: string,
  imageId: string,
): Promise<ProductImage> {
  const image = await images.findById(imageId);
  if (!image || image.productId !== productId) {
    throw new ProductImageNotFoundError();
  }
  return image;
}

/** The image as the panel shows it, once a change is committed. */
export async function imageResultOf(
  queries: AdminProductQueries,
  id: string,
): Promise<AdminProductImageResult> {
  const result = await queries.findImageById(id);
  if (!result) {
    throw new ProductImageNotFoundError();
  }
  return result;
}
