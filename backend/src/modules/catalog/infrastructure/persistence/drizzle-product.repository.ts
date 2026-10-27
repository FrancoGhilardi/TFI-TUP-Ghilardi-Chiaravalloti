import { Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Slug } from "../../../../shared/domain/value-objects/slug.js";
import {
  LockSpace,
  lockForTransaction,
} from "../../../../shared/infrastructure/database/advisory-lock.js";
import { DrizzleExecutor } from "../../../../shared/infrastructure/database/drizzle.executor.js";
import {
  productCategories,
  products,
  relatedProducts,
} from "../../../../shared/infrastructure/database/schema/index.js";
import type { Product } from "../../domain/entities/product.js";
import { ProductRepository } from "../../domain/repositories/product.repository.js";
import { ProductMapper } from "./product.mapper.js";

@Injectable()
export class DrizzleProductRepository extends ProductRepository {
  constructor(private readonly executor: DrizzleExecutor) {
    super();
  }

  /** Inside a transaction the row is locked, as `save` writes it whole. */
  async findById(id: string): Promise<Product | null> {
    const db = this.executor.current();
    const query = db.select().from(products).where(eq(products.id, id)).limit(1);
    const [row] = this.executor.hasActiveTransaction() ? await query.for("update") : await query;
    if (!row) {
      return null;
    }
    const [categories, related] = await Promise.all([
      db
        .select({
          categoryId: productCategories.categoryId,
          isPrimary: productCategories.isPrimary,
        })
        .from(productCategories)
        .where(eq(productCategories.productId, id)),
      db
        .select({ id: relatedProducts.relatedProductId })
        .from(relatedProducts)
        .where(eq(relatedProducts.productId, id))
        .orderBy(asc(relatedProducts.sortOrder)),
    ]);
    return ProductMapper.toDomain(
      row,
      categories,
      related.map((product) => product.id),
    );
  }

  async existsBySlug(slug: Slug): Promise<boolean> {
    const [row] = await this.executor
      .current()
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug.toString()))
      .limit(1);
    return row !== undefined;
  }

  lockSlug(slug: Slug): Promise<void> {
    return lockForTransaction(this.executor, LockSpace.PRODUCT_SLUG, slug.toString());
  }

  /** Inside a transaction the rows found are share-locked, so none is deleted until it ends. */
  async findExistingIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }
    const query = this.executor
      .current()
      .select({ id: products.id })
      .from(products)
      .where(and(inArray(products.id, ids), isNull(products.deletedAt)));
    const rows = this.executor.hasActiveTransaction() ? await query.for("share") : await query;
    return rows.map((row) => row.id);
  }

  /**
   * Writes the row and replaces its categories and its related products, these only if they
   * changed. The database checks at
   * commit that a product keeps a category and an image, so it runs inside a transaction.
   */
  async save(product: Product): Promise<void> {
    const db = this.executor.current();
    const row = ProductMapper.toPersistence(product);
    // Who created it, when, its SKU and its slug never change after the insert; the database
    // stamps updated_at on every update.
    const changes: Partial<typeof row> = { ...row };
    delete changes.id;
    delete changes.sku;
    delete changes.slug;
    delete changes.createdAt;
    delete changes.createdBy;
    delete changes.updatedAt;
    const id = product.getId();
    await db.insert(products).values(row).onConflictDoUpdate({ target: products.id, set: changes });

    await db.delete(productCategories).where(eq(productCategories.productId, id));
    await db.insert(productCategories).values(
      product.categories.map((assignment) => ({
        productId: id,
        categoryId: assignment.categoryId,
        isPrimary: assignment.isPrimary,
      })),
    );

    // Rewritten only when they changed: each inserted row key-share-locks the related product,
    // so two saves of products related to each other (a deletion, a restore) would deadlock.
    const stored = await db
      .select({ id: relatedProducts.relatedProductId })
      .from(relatedProducts)
      .where(eq(relatedProducts.productId, id))
      .orderBy(asc(relatedProducts.sortOrder));
    if (
      stored.length === product.relatedProductIds.length &&
      stored.every((related, index) => related.id === product.relatedProductIds[index])
    ) {
      return;
    }
    await db.delete(relatedProducts).where(eq(relatedProducts.productId, id));
    if (product.relatedProductIds.length > 0) {
      await db.insert(relatedProducts).values(
        product.relatedProductIds.map((relatedProductId, index) => ({
          productId: id,
          relatedProductId,
          sortOrder: index,
        })),
      );
    }
  }
}
