import { Injectable, Logger } from "@nestjs/common";
import { alias } from "drizzle-orm/pg-core";
import { asc, desc, eq, sql } from "drizzle-orm";
import { stackWithCauses } from "../../../../shared/application/error-stack.js";
import { FileStorage } from "../../../../shared/application/file-storage.js";
import type { Database } from "../../../../shared/infrastructure/database/drizzle.client.js";
import {
  type DbExecutor,
  DrizzleExecutor,
} from "../../../../shared/infrastructure/database/drizzle.executor.js";
import {
  categories,
  productCategories,
  productImages,
  products,
  relatedProducts,
  users,
} from "../../../../shared/infrastructure/database/schema/index.js";
import type {
  AdminProductDetailResult,
  AdminProductImageResult,
  UserSummaryResult,
} from "../../application/dto/admin-product-detail.result.js";
import { AdminProductQueries } from "../../application/ports/admin-product-queries.js";
import { ImageSettings } from "../../application/settings/image-settings.js";
import { ImageStatus } from "../../domain/image-status.js";

const creator = alias(users, "creator");
const editor = alias(users, "editor");
const related = alias(products, "related");

@Injectable()
export class DrizzleAdminProductQueries extends AdminProductQueries {
  private readonly logger = new Logger(AdminProductQueries.name);

  constructor(
    private readonly executor: DrizzleExecutor,
    private readonly storage: FileStorage,
    private readonly settings: ImageSettings,
  ) {
    super();
  }

  /**
   * Every part is read from one snapshot, so an edit committed meanwhile never mixes old and
   * new data; the links are signed afterwards, with no transaction open on Storage.
   */
  async findById(id: string): Promise<AdminProductDetailResult | null> {
    const [[row], assigned, images, relatedRows] = await this.inSnapshot((db) =>
      Promise.all([
        db
          .select({
            product: products,
            creatorName: creator.name,
            editorName: editor.name,
          })
          .from(products)
          .leftJoin(creator, eq(creator.id, products.createdBy))
          .leftJoin(editor, eq(editor.id, products.updatedBy))
          .where(eq(products.id, id))
          .limit(1),
        db
          .select({
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            isPrimary: productCategories.isPrimary,
          })
          .from(productCategories)
          .innerJoin(categories, eq(categories.id, productCategories.categoryId))
          .where(eq(productCategories.productId, id))
          // The primary one first, then by name as the form lists them.
          .orderBy(
            desc(productCategories.isPrimary),
            asc(sql`lower(${categories.name})`),
            asc(categories.id),
          ),
        db
          .select()
          .from(productImages)
          .where(eq(productImages.productId, id))
          .orderBy(asc(productImages.position)),
        db
          .select({ id: related.id, sku: related.sku, title: related.title, slug: related.slug })
          .from(relatedProducts)
          .innerJoin(related, eq(related.id, relatedProducts.relatedProductId))
          .where(eq(relatedProducts.productId, id))
          .orderBy(asc(relatedProducts.sortOrder)),
      ]),
    );
    if (!row) {
      return null;
    }

    const { product } = row;
    return {
      id: product.id,
      sku: product.sku,
      title: product.title,
      slug: product.slug,
      description: product.description,
      price: product.price,
      salePrice: product.salePrice,
      isOnSale: product.isOnSale,
      saleEndsAt: product.saleEndsAt,
      stock: product.stock,
      isFeatured: product.isFeatured,
      isNew: product.isNew,
      newUntil: product.newUntil,
      sortOrder: product.sortOrder,
      isActive: product.isActive,
      primaryCategoryId: assigned.find((category) => category.isPrimary)?.id ?? "",
      categories: assigned.map(({ id: categoryId, name, slug }) => ({
        id: categoryId,
        name,
        slug,
      })),
      images: await this.imageResults(images),
      relatedProducts: relatedRows,
      createdBy: summary(product.createdBy, row.creatorName),
      updatedBy: summary(product.updatedBy, row.editorName),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
    };
  }

  async findImageById(id: string): Promise<AdminProductImageResult | null> {
    const rows = await this.executor
      .current()
      .select()
      .from(productImages)
      .where(eq(productImages.id, id))
      .limit(1);
    const [image] = await this.imageResults(rows);
    return image ?? null;
  }

  async findImagesByProduct(productId: string): Promise<AdminProductImageResult[]> {
    const rows = await this.executor
      .current()
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.position));
    return this.imageResults(rows);
  }

  /**
   * In the open transaction, if there is one; otherwise in a read-only one that sees a single
   * snapshot of the database.
   */
  private inSnapshot<T>(read: (db: DbExecutor) => Promise<T>): Promise<T> {
    if (this.executor.hasActiveTransaction()) {
      return read(this.executor.current());
    }
    return (this.executor.current() as Database).transaction((tx) => read(tx), {
      isolationLevel: "repeatable read",
      accessMode: "read only",
    });
  }

  /**
   * One Storage call signs every original. If it fails the links are left out and the failure
   * is logged: a product just created must still be answered as created.
   */
  private async imageResults(
    images: (typeof productImages.$inferSelect)[],
  ): Promise<AdminProductImageResult[]> {
    const keys = images.map((image) => image.originalKey);
    const links = await this.storage
      .signedUrls(keys, this.settings.signedUrlTtlSeconds)
      .catch((error: unknown) => {
        this.logger.warn(`Signing ${keys.join(", ")} failed\n${stackWithCauses(error)}`);
        return keys.map(() => null);
      });
    return images.map((image, index) => ({
      id: image.id,
      position: image.position,
      previewUrl: links[index] ?? null,
      altText: image.altText,
      mimeType: image.mimeType,
      sizeBytes: image.sizeBytes,
      status: ImageStatus[image.status],
      createdAt: image.createdAt,
    }));
  }
}

function summary(id: string | null, name: string | null): UserSummaryResult | null {
  return id !== null && name !== null ? { id, name } : null;
}
