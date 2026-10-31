import { Injectable, Logger } from "@nestjs/common";
import { alias } from "drizzle-orm/pg-core";
import { asc, desc, eq, type SQL, sql } from "drizzle-orm";
import { stackWithCauses } from "../../../../shared/application/error-stack.js";
import { FileStorage } from "../../../../shared/application/file-storage.js";
import {
  offsetOf,
  type Page,
  pageOf,
  RecordStatusFilter,
  SortDirection,
} from "../../../../shared/application/pagination.js";
import { containsPattern } from "../../../../shared/infrastructure/database/like-pattern.js";
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
import type {
  AdminProductListItemResult,
  AdminProductThumbnailResult,
} from "../../application/dto/admin-product-list-item.result.js";
import {
  AdminProductSortField,
  type ListAdminProductsQuery,
} from "../../application/dto/list-admin-products.query.js";
import { AdminProductQueries } from "../../application/ports/admin-product-queries.js";
import { ImageSettings } from "../../application/settings/image-settings.js";
import { ImageStatus } from "../../domain/image-status.js";
import {
  markFiltersOf,
  newMarkRunsAt,
  saleRunsAt,
  sortableName,
  unaccentedLike,
} from "./catalog-sql.js";

const creator = alias(users, "creator");
const editor = alias(users, "editor");
const related = alias(products, "related");

// A row of the list, read with raw SQL; its timestamps come as text.
interface ListRow {
  [column: string]: unknown;
  id: string;
  sku: string;
  title: string;
  slug: string;
  price: string;
  sale_price: string | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  sale_runs: boolean;
  new_runs: boolean;
  updated_at: string;
  deleted_at: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  image_id: string | null;
  image_public_key: string | null;
  image_original_key: string | null;
  image_alt_text: string | null;
  total_items: number;
}

const SORTABLE_TITLE = sortableName(sql`p.title`);

const LIST_SORT: Record<AdminProductSortField, SQL[]> = {
  [AdminProductSortField.TITLE]: [SORTABLE_TITLE],
  // By length first: past LMS-999999 the text alone would put LMS-1000000 before LMS-200000.
  [AdminProductSortField.SKU]: [sql`length(p.sku)`, sql`p.sku`],
  [AdminProductSortField.PRICE]: [sql`p.price`],
  [AdminProductSortField.STOCK]: [sql`p.stock`],
  [AdminProductSortField.CREATED_AT]: [sql`p.created_at`],
  [AdminProductSortField.UPDATED_AT]: [sql`p.updated_at`],
};

function statusOf(status: RecordStatusFilter | undefined): SQL {
  switch (status) {
    case RecordStatusFilter.ACTIVE:
      return sql`p.deleted_at IS NULL AND p.is_active`;
    case RecordStatusFilter.INACTIVE:
      return sql`p.deleted_at IS NULL AND NOT p.is_active`;
    case RecordStatusFilter.DELETED:
      return sql`p.deleted_at IS NOT NULL`;
    case RecordStatusFilter.ALL:
      return sql`true`;
    case undefined:
      return sql`p.deleted_at IS NULL`;
  }
}

/** Every filter of the query, joined; the category one needs the `branch` CTE. */
function filtersOf(query: ListAdminProductsQuery, now: Date): SQL {
  const filters = [statusOf(query.status)];
  if (query.q) {
    const pattern = containsPattern(query.q);
    filters.push(sql`(${unaccentedLike(sql`p.title`, pattern)} OR p.sku ILIKE ${pattern})`);
  }
  if (query.categoryId !== undefined) {
    filters.push(sql`EXISTS (
      SELECT 1 FROM libreria.product_categories assigned
      WHERE assigned.product_id = p.id AND assigned.category_id IN (SELECT id FROM branch)
    )`);
  }
  filters.push(...markFiltersOf(query, now));
  if (query.maxStock !== undefined) {
    filters.push(sql`p.stock <= ${query.maxStock}`);
  }
  return sql.join(filters, sql` AND `);
}

/**
 * The category and every current one below it, active or not; one in a loop left in the data
 * is reached only once.
 */
function branchOf(categoryId: string | undefined): SQL {
  return categoryId === undefined
    ? sql``
    : sql`WITH RECURSIVE branch AS (
        SELECT id FROM libreria.categories WHERE id = ${categoryId}
        UNION
        SELECT child.id FROM libreria.categories child
        JOIN branch ON child.parent_id = branch.id
        WHERE child.deleted_at IS NULL
      )`;
}

/**
 * By the field asked, the last change when none is; in the direction asked or, when none
 * is, descending for the default and ascending for a field chosen. Ties always go by title
 * and id.
 */
function orderOf(query: ListAdminProductsQuery): SQL {
  const field = query.sortBy ?? AdminProductSortField.UPDATED_AT;
  const direction =
    query.sortDir ?? (query.sortBy === undefined ? SortDirection.DESC : SortDirection.ASC);
  const keyword = sql.raw(direction === SortDirection.DESC ? "DESC" : "ASC");
  const columns = LIST_SORT[field].map((column) => sql`${column} ${keyword}`);
  return sql`${sql.join(columns, sql`, `)}, ${SORTABLE_TITLE} ASC, p.id ASC`;
}

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

  async findPage(
    query: ListAdminProductsQuery,
    now: Date,
  ): Promise<Page<AdminProductListItemResult>> {
    const ctes = branchOf(query.categoryId);
    const filters = filtersOf(query, now);
    const db = this.executor.current();
    // One query, so a page with rows and its total come from the same snapshot.
    const { rows } = await db.execute<ListRow>(sql`
      ${ctes}
      SELECT p.id, p.sku, p.title, p.slug, p.price, p.sale_price, p.stock, p.is_active,
        p.is_featured, ${saleRunsAt(now)} AS sale_runs, ${newMarkRunsAt(now)} AS new_runs,
        p.updated_at, p.deleted_at,
        category.id AS category_id, category.name AS category_name,
        category.slug AS category_slug,
        image.id AS image_id, image.public_key AS image_public_key,
        image.original_key AS image_original_key, image.alt_text AS image_alt_text,
        count(*) OVER ()::int AS total_items
      FROM libreria.products p
      LEFT JOIN libreria.product_categories primary_assignment
        ON primary_assignment.product_id = p.id AND primary_assignment.is_primary
      LEFT JOIN libreria.categories category ON category.id = primary_assignment.category_id
      LEFT JOIN LATERAL (
        SELECT id, public_key, original_key, alt_text FROM libreria.product_images
        WHERE product_id = p.id
        ORDER BY position
        LIMIT 1
      ) image ON true
      WHERE ${filters}
      ORDER BY ${orderOf(query)}
      LIMIT ${query.limit} OFFSET ${offsetOf(query)}`);
    // Past the last page there is no row to carry the total, so it is counted apart.
    const totalItems =
      rows[0]?.total_items ??
      (query.page === 1
        ? 0
        : (
            await db.execute<{ [column: string]: unknown; total: number }>(sql`
              ${ctes}
              SELECT count(*)::int AS total FROM libreria.products p WHERE ${filters}`)
          ).rows[0].total);
    const thumbnails = await this.thumbnailsOf(rows);
    return pageOf(
      rows.map((row, index) => listItemOf(row, thumbnails[index])),
      totalItems,
      query,
    );
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

  /** One query: the product, so an unknown one is told apart, joined to its images. */
  async findImagesByProduct(productId: string): Promise<AdminProductImageResult[] | null> {
    const rows = await this.executor
      .current()
      .select({ image: productImages })
      .from(products)
      .leftJoin(productImages, eq(productImages.productId, products.id))
      .where(eq(products.id, productId))
      .orderBy(asc(productImages.position));
    if (rows.length === 0) {
      return null;
    }
    return this.imageResults(rows.flatMap(({ image }) => (image ? [image] : [])));
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
   * The public version of each first image or, without one, a link to its original; every
   * original of the page is signed in one Storage call, and a failure only leaves them out.
   */
  private async thumbnailsOf(rows: ListRow[]): Promise<(AdminProductThumbnailResult | null)[]> {
    const toSign = rows
      .filter((row) => row.image_public_key === null && row.image_original_key !== null)
      .map((row) => row.image_original_key!);
    const signed = await this.signOrNone(toSign);
    const links = new Map(toSign.map((key, index) => [key, signed[index] ?? null]));
    return rows.map((row) => {
      if (row.image_id === null) {
        return null;
      }
      const url =
        row.image_public_key !== null
          ? this.storage.publicUrl(row.image_public_key)
          : (links.get(row.image_original_key ?? "") ?? null);
      return { id: row.image_id, url, altText: row.image_alt_text };
    });
  }

  /** Links to the originals in one Storage call; a failure is logged and leaves them out. */
  private signOrNone(keys: string[]): Promise<(string | null)[]> {
    return this.storage
      .signedUrls(keys, this.settings.signedUrlTtlSeconds)
      .catch((error: unknown) => {
        this.logger.warn(`Signing ${keys.join(", ")} failed\n${stackWithCauses(error)}`);
        return keys.map(() => null);
      });
  }

  /**
   * One Storage call signs every original. If it fails the links are left out and the failure
   * is logged: a product just created must still be answered as created.
   */
  private async imageResults(
    images: (typeof productImages.$inferSelect)[],
  ): Promise<AdminProductImageResult[]> {
    const links = await this.signOrNone(images.map((image) => image.originalKey));
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

function listItemOf(
  row: ListRow,
  thumbnail: AdminProductThumbnailResult | null,
): AdminProductListItemResult {
  return {
    id: row.id,
    sku: row.sku,
    title: row.title,
    slug: row.slug,
    price: row.price,
    salePrice: row.sale_runs ? row.sale_price : null,
    stock: row.stock,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    isNew: row.new_runs,
    isOnSale: row.sale_runs,
    primaryCategory:
      row.category_id !== null && row.category_name !== null && row.category_slug !== null
        ? { id: row.category_id, name: row.category_name, slug: row.category_slug }
        : null,
    thumbnail,
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at === null ? null : new Date(row.deleted_at),
  };
}
