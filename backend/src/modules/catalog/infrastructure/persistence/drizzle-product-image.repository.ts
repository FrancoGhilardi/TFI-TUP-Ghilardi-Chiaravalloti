import { Injectable } from "@nestjs/common";
import { count, eq, sql } from "drizzle-orm";
import { DrizzleExecutor } from "../../../../shared/infrastructure/database/drizzle.executor.js";
import { productImages } from "../../../../shared/infrastructure/database/schema/index.js";
import type { ProductImage } from "../../domain/entities/product-image.js";
import { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import { ProductImageMapper } from "./product-image.mapper.js";

@Injectable()
export class DrizzleProductImageRepository extends ProductImageRepository {
  constructor(private readonly executor: DrizzleExecutor) {
    super();
  }

  async saveAll(images: ProductImage[]): Promise<void> {
    if (images.length === 0) {
      return;
    }
    // The product an image belongs to and when it was added never change.
    await this.executor
      .current()
      .insert(productImages)
      .values(images.map((image) => ProductImageMapper.toPersistence(image)))
      .onConflictDoUpdate({
        target: productImages.id,
        set: {
          position: sql`excluded.position`,
          originalKey: sql`excluded.original_key`,
          publicKey: sql`excluded.public_key`,
          altText: sql`excluded.alt_text`,
          mimeType: sql`excluded.mime_type`,
          width: sql`excluded.width`,
          height: sql`excluded.height`,
          sizeBytes: sql`excluded.size_bytes`,
          status: sql`excluded.status`,
        },
      });
  }

  /** Inside a transaction the row is locked, as `saveAll` writes it whole. */
  async findById(id: string): Promise<ProductImage | null> {
    const query = this.executor
      .current()
      .select()
      .from(productImages)
      .where(eq(productImages.id, id))
      .limit(1);
    const [row] = this.executor.hasActiveTransaction() ? await query.for("update") : await query;
    return row ? ProductImageMapper.toDomain(row) : null;
  }

  async countByProduct(productId: string): Promise<number> {
    const [row] = await this.executor
      .current()
      .select({ total: count() })
      .from(productImages)
      .where(eq(productImages.productId, productId));
    return row.total;
  }
}
