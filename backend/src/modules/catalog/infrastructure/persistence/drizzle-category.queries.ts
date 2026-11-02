import { Injectable } from "@nestjs/common";
import { and, eq, isNull, type SQL, sql } from "drizzle-orm";
import {
  offsetOf,
  type Page,
  pageOf,
  RecordStatusFilter,
  SortDirection,
} from "../../../../shared/application/pagination.js";
import { containsPattern } from "../../../../shared/infrastructure/database/like-pattern.js";
import { DrizzleExecutor } from "../../../../shared/infrastructure/database/drizzle.executor.js";
import { categories } from "../../../../shared/infrastructure/database/schema/index.js";
import type { AdminCategoryResult } from "../../application/dto/admin-category.result.js";
import {
  CategorySortField,
  type ListAdminCategoriesQuery,
} from "../../application/dto/list-admin-categories.query.js";
import { CategoryQueries } from "../../application/ports/category-queries.js";
import type { CategoryTreeRow } from "../../application/services/category-tree.js";

// A type, not an interface: a raw query needs an indexable row. Its timestamps come as text.
type AdminRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  parentName: string | null;
  parentSlug: string | null;
  sortOrder: number;
  isActive: boolean;
  depth: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// Case and accents do not change the order, as in the store tree.
const SORTABLE_NAME = sql.raw("lower(libreria.immutable_unaccent(category.name))");

/**
 * Every category reachable from a root, with its depth and the path that sorts the tree: at
 * each level the position, the name and the id. A category in a loop left in the data by hand
 * is never reached, so the walk always ends.
 */
const TREE = sql.raw(`
  WITH RECURSIVE tree AS (
    SELECT root.id, 0 AS depth,
      ARRAY[lpad(root.sort_order::text, 10, '0'), lower(libreria.immutable_unaccent(root.name)), root.id::text] AS path
    FROM libreria.categories root
    WHERE root.parent_id IS NULL
    UNION ALL
    SELECT child.id, tree.depth + 1,
      tree.path || ARRAY[lpad(child.sort_order::text, 10, '0'), lower(libreria.immutable_unaccent(child.name)), child.id::text]
    FROM libreria.categories child
    JOIN tree ON child.parent_id = tree.id
  )
`);

const FROM_TREE = sql.raw(`
  FROM tree
  JOIN libreria.categories category ON category.id = tree.id
  LEFT JOIN libreria.categories parent ON parent.id = category.parent_id
`);

const ADMIN_COLUMNS = sql.raw(`
  category.id, category.name, category.slug, category.description,
  parent.id AS "parentId", parent.name AS "parentName", parent.slug AS "parentSlug",
  category.sort_order AS "sortOrder", category.is_active AS "isActive", tree.depth,
  (
    SELECT count(*)::int
    FROM libreria.product_categories assignment
    JOIN libreria.products product ON product.id = assignment.product_id
    WHERE assignment.category_id = category.id AND product.deleted_at IS NULL
  ) AS "productCount",
  category.created_at AS "createdAt", category.updated_at AS "updatedAt",
  category.deleted_at AS "deletedAt"
`);

const SORT_COLUMNS: Record<CategorySortField, SQL> = {
  [CategorySortField.NAME]: SORTABLE_NAME,
  [CategorySortField.SORT_ORDER]: sql.raw("category.sort_order"),
  [CategorySortField.CREATED_AT]: sql.raw("category.created_at"),
  [CategorySortField.UPDATED_AT]: sql.raw("category.updated_at"),
};

@Injectable()
export class DrizzleCategoryQueries extends CategoryQueries {
  constructor(private readonly executor: DrizzleExecutor) {
    super();
  }

  findVisibleRows(): Promise<CategoryTreeRow[]> {
    return this.executor
      .current()
      .select({
        id: categories.id,
        parentId: categories.parentId,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .where(and(eq(categories.isActive, true), isNull(categories.deletedAt)));
  }

  async findAdminPage(query: ListAdminCategoriesQuery): Promise<Page<AdminCategoryResult>> {
    const where = whereOf([
      statusCondition(query.status),
      searchCondition(query.q),
      query.parentId === undefined ? undefined : sql`category.parent_id = ${query.parentId}`,
    ]);
    const db = this.executor.current();
    const [{ rows }, { rows: totals }] = await Promise.all([
      db.execute<AdminRow>(sql`
        ${TREE} SELECT ${ADMIN_COLUMNS} ${FROM_TREE} ${where}
        ORDER BY ${orderOf(query)}
        LIMIT ${query.limit} OFFSET ${offsetOf(query)}
      `),
      db.execute<{ total: number }>(
        sql`${TREE} SELECT count(*)::int AS total ${FROM_TREE} ${where}`,
      ),
    ]);
    return pageOf(rows.map(toResult), totals[0]?.total ?? 0, query);
  }

  /**
   * Walks up from the category only, so its depth costs one row per level; a loop left in the
   * data by hand ends the walk instead of hiding the category.
   */
  async findAdminById(id: string): Promise<AdminCategoryResult | null> {
    const { rows } = await this.executor.current().execute<AdminRow>(sql`
      WITH RECURSIVE upward AS (
        SELECT start.id, start.parent_id
        FROM libreria.categories start
        WHERE start.id = ${id}
        UNION ALL
        SELECT above.id, above.parent_id
        FROM upward
        JOIN libreria.categories above ON above.id = upward.parent_id
      ) CYCLE id SET is_cycle USING visited
      SELECT ${ADMIN_COLUMNS}
      FROM libreria.categories category
      LEFT JOIN libreria.categories parent ON parent.id = category.parent_id
      CROSS JOIN (SELECT count(*)::int - 1 AS depth FROM upward WHERE NOT is_cycle) tree
      WHERE category.id = ${id}
    `);
    return rows[0] ? toResult(rows[0]) : null;
  }
}

function whereOf(conditions: (SQL | undefined)[]): SQL {
  const present = conditions.filter((condition) => condition !== undefined);
  return present.length === 0 ? sql`` : sql`WHERE ${sql.join(present, sql` AND `)}`;
}

function statusCondition(status: RecordStatusFilter | undefined): SQL | undefined {
  switch (status) {
    case RecordStatusFilter.ACTIVE:
      return sql`category.deleted_at IS NULL AND category.is_active`;
    case RecordStatusFilter.INACTIVE:
      return sql`category.deleted_at IS NULL AND NOT category.is_active`;
    case RecordStatusFilter.DELETED:
      return sql`category.deleted_at IS NOT NULL`;
    case RecordStatusFilter.ALL:
      return undefined;
    case undefined:
      return sql`category.deleted_at IS NULL`;
  }
}

function searchCondition(text: string | undefined): SQL | undefined {
  if (!text) {
    return undefined;
  }
  const pattern = containsPattern(text);
  return sql`(libreria.immutable_unaccent(category.name) ILIKE libreria.immutable_unaccent(${pattern})
    OR category.slug ILIKE libreria.immutable_unaccent(${pattern}))`;
}

/** The tree order unless the listing is sorted, searched or narrowed to one parent. */
function orderOf(query: ListAdminCategoriesQuery): SQL {
  if (query.sortBy === undefined && !query.q && query.parentId === undefined) {
    return sql`tree.path`;
  }
  const column = SORT_COLUMNS[query.sortBy ?? CategorySortField.NAME];
  const direction = sql.raw(query.sortDir === SortDirection.DESC ? "DESC" : "ASC");
  return sql`${column} ${direction}, ${SORTABLE_NAME} ASC, category.id ASC`;
}

function toResult(row: AdminRow): AdminCategoryResult {
  const { parentId, parentName, parentSlug, createdAt, updatedAt, deletedAt, ...category } = row;
  return {
    ...category,
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
    deletedAt: deletedAt === null ? null : new Date(deletedAt),
    parent:
      parentId !== null && parentName !== null && parentSlug !== null
        ? { id: parentId, name: parentName, slug: parentSlug }
        : null,
  };
}
