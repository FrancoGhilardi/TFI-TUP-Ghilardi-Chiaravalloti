import { Injectable } from "@nestjs/common";
import { and, count, eq, inArray, isNull, ne, type SQL, sql } from "drizzle-orm";
import type { Slug } from "../../../../shared/domain/value-objects/slug.js";
import {
  LockSpace,
  lockForTransaction,
} from "../../../../shared/infrastructure/database/advisory-lock.js";
import { isUniqueViolation } from "../../../../shared/infrastructure/database/constraint-violation.js";
import { DrizzleExecutor } from "../../../../shared/infrastructure/database/drizzle.executor.js";
import { categories } from "../../../../shared/infrastructure/database/schema/index.js";
import type { Category } from "../../domain/entities/category.js";
import { CategoryNameInUseError } from "../../domain/errors/category-name-in-use-error.js";
import { CategoryRepository } from "../../domain/repositories/category.repository.js";
import { CategoryMapper } from "./category.mapper.js";

const NAME_INDEX = "uq_categories_name_not_deleted";

// "Current" categories are the ones not deleted, as in the unique name index.
const isCurrent = isNull(categories.deletedAt);

@Injectable()
export class DrizzleCategoryRepository extends CategoryRepository {
  constructor(private readonly executor: DrizzleExecutor) {
    super();
  }

  /**
   * `save` writes the whole row, so inside a transaction the row is locked when read: a
   * concurrent change waits instead of being overwritten by a stale copy, and a parent read
   * this way cannot be deleted until the transaction ends.
   */
  async findById(id: string): Promise<Category | null> {
    const query = this.executor
      .current()
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    const [row] = this.executor.hasActiveTransaction() ? await query.for("update") : await query;
    return row ? CategoryMapper.toDomain(row) : null;
  }

  /**
   * Inside a transaction the rows found are share-locked until it ends: a deletion, which
   * locks the category for update, waits and then counts the product that uses it.
   */
  async findVisibleByIds(ids: string[]): Promise<Category[]> {
    if (ids.length === 0) {
      return [];
    }
    const query = this.executor
      .current()
      .select()
      .from(categories)
      .where(and(inArray(categories.id, ids), eq(categories.isActive, true), isCurrent));
    const rows = this.executor.hasActiveTransaction() ? await query.for("share") : await query;
    return rows.map((row) => CategoryMapper.toDomain(row));
  }

  /** Share-locked inside a transaction, like `findVisibleByIds`. */
  async findCurrentIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }
    const query = this.executor
      .current()
      .select({ id: categories.id })
      .from(categories)
      .where(and(inArray(categories.id, ids), isCurrent));
    const rows = this.executor.hasActiveTransaction() ? await query.for("share") : await query;
    return rows.map((row) => row.id);
  }

  // The same comparison as the unique name index.
  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    return this.exists(
      and(
        sql`lower(${categories.name}) = lower(${name})`,
        isCurrent,
        excludeId === undefined ? undefined : ne(categories.id, excludeId),
      ),
    );
  }

  async existsBySlug(slug: Slug): Promise<boolean> {
    return this.exists(eq(categories.slug, slug.toString()));
  }

  async findAncestorIds(id: string): Promise<string[]> {
    // A loop left in the data by hand ends the walk instead of making it endless.
    const { rows } = await this.executor.current().execute<{ id: string }>(sql`
      WITH RECURSIVE ancestors AS (
        SELECT parent.id, parent.parent_id, 1 AS depth
        FROM libreria.categories child
        JOIN libreria.categories parent ON parent.id = child.parent_id
        WHERE child.id = ${id}
        UNION ALL
        SELECT parent.id, parent.parent_id, ancestors.depth + 1
        FROM ancestors
        JOIN libreria.categories parent ON parent.id = ancestors.parent_id
      ) CYCLE id SET is_cycle USING visited
      SELECT id FROM ancestors WHERE NOT is_cycle ORDER BY depth
    `);
    return rows.map((row) => row.id);
  }

  async countCurrentChildren(id: string): Promise<number> {
    const [row] = await this.executor
      .current()
      .select({ total: count() })
      .from(categories)
      .where(and(eq(categories.parentId, id), isCurrent));
    return row?.total ?? 0;
  }

  async countProductsWhereOnlyCategory(id: string): Promise<number> {
    // Another category that is deleted does not count: the product would be left without a
    // current one.
    const { rows } = await this.executor.current().execute<{ total: number }>(sql`
      SELECT count(*)::int AS total
      FROM libreria.products product
      WHERE product.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM libreria.product_categories assignment
          WHERE assignment.product_id = product.id AND assignment.category_id = ${id}
        )
        AND NOT EXISTS (
          SELECT 1
          FROM libreria.product_categories assignment
          JOIN libreria.categories other ON other.id = assignment.category_id
          WHERE assignment.product_id = product.id
            AND assignment.category_id <> ${id}
            AND other.deleted_at IS NULL
        )
    `);
    return rows[0]?.total ?? 0;
  }

  lockHierarchy(): Promise<void> {
    return lockForTransaction(this.executor, LockSpace.CATEGORY_HIERARCHY, "hierarchy");
  }

  lockSlug(slug: Slug): Promise<void> {
    return lockForTransaction(this.executor, LockSpace.CATEGORY_SLUG, slug.toString());
  }

  async save(category: Category): Promise<void> {
    const row = CategoryMapper.toPersistence(category);
    // When it was created and its slug never change after the insert; the database stamps
    // updated_at on every update.
    const changes: Partial<typeof row> = { ...row };
    delete changes.id;
    delete changes.slug;
    delete changes.createdAt;
    delete changes.updatedAt;
    try {
      await this.executor
        .current()
        .insert(categories)
        .values(row)
        .onConflictDoUpdate({ target: categories.id, set: changes });
    } catch (error) {
      // Two saves at once with the same name pass the existsByName check; the index stops
      // the second, which is the same conflict.
      if (isUniqueViolation(error, NAME_INDEX)) {
        throw new CategoryNameInUseError();
      }
      throw error;
    }
  }

  private async exists(where: SQL | undefined): Promise<boolean> {
    const [row] = await this.executor
      .current()
      .select({ id: categories.id })
      .from(categories)
      .where(where)
      .limit(1);
    return row !== undefined;
  }
}
