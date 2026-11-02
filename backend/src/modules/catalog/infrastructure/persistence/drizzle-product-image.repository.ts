import { Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
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
}
