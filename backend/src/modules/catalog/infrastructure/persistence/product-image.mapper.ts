import type { productImages } from "../../../../shared/infrastructure/database/schema/index.js";
import { ProductImage, type ProductImageMimeType } from "../../domain/entities/product-image.js";
import { ImageStatus } from "../../domain/image-status.js";

export type ProductImageRow = typeof productImages.$inferSelect;
export type NewProductImageRow = typeof productImages.$inferInsert;

/** Translates between the `product_images` table and `ProductImage`. */
export const ProductImageMapper = {
  toDomain(row: ProductImageRow): ProductImage {
    return ProductImage.reconstitute({
      id: row.id,
      productId: row.productId,
      position: row.position,
      originalKey: row.originalKey,
      publicKey: row.publicKey ?? undefined,
      altText: row.altText ?? undefined,
      // The database only accepts these formats.
      mimeType: row.mimeType as ProductImageMimeType,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
      sizeBytes: row.sizeBytes ?? undefined,
      status: ImageStatus[row.status],
      pendingSince: row.pendingSince ?? undefined,
      processingAttempts: row.processingAttempts,
      createdAt: row.createdAt,
    });
  },

  toPersistence(image: ProductImage): NewProductImageRow {
    return {
      id: image.getId(),
      productId: image.productId,
      position: image.position,
      originalKey: image.originalKey,
      publicKey: image.publicKey ?? null,
      altText: image.altText ?? null,
      mimeType: image.mimeType,
      width: image.width ?? null,
      height: image.height ?? null,
      sizeBytes: image.sizeBytes ?? null,
      status: image.status,
      pendingSince: image.pendingSince ?? null,
      processingAttempts: image.processingAttempts,
      createdAt: image.createdAt,
    };
  },
};
