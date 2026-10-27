import { Slug } from "../../../../shared/domain/value-objects/slug.js";
import type { categories } from "../../../../shared/infrastructure/database/schema/index.js";
import { Category } from "../../domain/entities/category.js";

export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;

/** Translates between the `categories` table and the `Category` entity. */
export const CategoryMapper = {
  toDomain(row: CategoryRow): Category {
    return Category.reconstitute({
      id: row.id,
      parentId: row.parentId ?? undefined,
      name: row.name,
      slug: Slug.fromValue(row.slug),
      description: row.description ?? undefined,
      sortOrder: row.sortOrder,
      active: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? undefined,
    });
  },

  toPersistence(category: Category): NewCategoryRow {
    return {
      id: category.getId(),
      parentId: category.parentId ?? null,
      name: category.name,
      slug: category.slug.toString(),
      description: category.description ?? null,
      sortOrder: category.sortOrder,
      isActive: category.active,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: category.deletedAt ?? null,
    };
  },
};
