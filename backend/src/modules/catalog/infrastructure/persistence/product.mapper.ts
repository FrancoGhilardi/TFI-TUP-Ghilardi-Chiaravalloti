import { Money } from "../../../../shared/domain/value-objects/money.js";
import { Slug } from "../../../../shared/domain/value-objects/slug.js";
import type { products } from "../../../../shared/infrastructure/database/schema/index.js";
import { Product } from "../../domain/entities/product.js";
import { CategoryAssignment } from "../../domain/value-objects/category-assignment.js";
import { Sku } from "../../domain/value-objects/sku.js";

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;

export interface ProductCategoryRow {
  categoryId: string;
  isPrimary: boolean;
}

/** Translates between the `products` table, with its categories and related ones, and `Product`. */
export const ProductMapper = {
  toDomain(row: ProductRow, categories: ProductCategoryRow[], relatedIds: string[]): Product {
    const primary = categories.find((category) => category.isPrimary)?.categoryId ?? "";
    return Product.reconstitute({
      id: row.id,
      sku: Sku.fromValue(row.sku),
      title: row.title,
      slug: Slug.fromValue(row.slug),
      description: row.description ?? undefined,
      price: Money.fromDecimal(row.price),
      salePrice: row.salePrice === null ? undefined : Money.fromDecimal(row.salePrice),
      onSale: row.isOnSale,
      saleEndsAt: row.saleEndsAt ?? undefined,
      stock: row.stock,
      featured: row.isFeatured,
      isNewFlag: row.isNew,
      newUntil: row.newUntil ?? undefined,
      sortOrder: row.sortOrder,
      active: row.isActive,
      categories: CategoryAssignment.fromIds(
        categories.map((category) => category.categoryId),
        primary,
      ),
      relatedProductIds: relatedIds,
      createdBy: row.createdBy ?? undefined,
      updatedBy: row.updatedBy ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? undefined,
    });
  },

  toPersistence(product: Product): NewProductRow {
    return {
      id: product.getId(),
      sku: product.sku.toString(),
      title: product.title,
      slug: product.slug.toString(),
      description: product.description ?? null,
      price: product.price.toDecimalString(),
      salePrice: product.salePrice?.toDecimalString() ?? null,
      isOnSale: product.onSale,
      saleEndsAt: product.saleEndsAt ?? null,
      stock: product.stock,
      isFeatured: product.featured,
      isNew: product.isNewFlag,
      newUntil: product.newUntil ?? null,
      sortOrder: product.sortOrder,
      isActive: product.active,
      createdBy: product.createdBy ?? null,
      updatedBy: product.updatedBy ?? null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt ?? null,
    };
  },
};
