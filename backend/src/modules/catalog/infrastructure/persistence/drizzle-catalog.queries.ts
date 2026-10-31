import { Injectable } from "@nestjs/common";
import { type SQL, sql } from "drizzle-orm";
import { FileStorage } from "../../../../shared/application/file-storage.js";
import { offsetOf, type Page, pageOf } from "../../../../shared/application/pagination.js";
import { DrizzleExecutor } from "../../../../shared/infrastructure/database/drizzle.executor.js";
import type { CategorySummaryResult } from "../../application/dto/admin-category.result.js";
import type {
  ProductCardResult,
  ProductImageResult,
} from "../../application/dto/product-card.result.js";
import type { ProductPage } from "../../application/dto/product-detail.result.js";
import type { CatalogPageQuery } from "../../application/dto/catalog-page.query.js";
import { CatalogQueries } from "../../application/ports/catalog-queries.js";
import { runsAt } from "../../domain/runs-at.js";
import {
  markFiltersOf,
  matchesEveryWord,
  newMarkRunsAt,
  sortableName,
  startsWithText,
  VISIBLE_CATEGORIES,
} from "./catalog-sql.js";

// The store shows an image by its public version. One being processed again, or whose new
// processing failed, keeps the version it had, which is always a whole file.
const HAS_PUBLIC_VERSION = sql.raw("public_key IS NOT NULL");

// Active and not deleted; `p` is the product. The card queries need nothing else, since their
// join on the first image with a public version already leaves out a product without one.
const IS_LISTED = sql`p.is_active AND p.deleted_at IS NULL`;

// Listed and with an image to show.
const IS_VISIBLE = sql`
  ${IS_LISTED}
  AND EXISTS (
    SELECT 1 FROM libreria.product_images shown
    WHERE shown.product_id = p.id AND shown.${HAS_PUBLIC_VERSION}
  )`;

const STORE_ORDER = sql`p.sort_order ASC, p.created_at DESC, p.id ASC`;

// A card: the product, its first image to show and its primary category if visible.
const CARD_COLUMNS = sql`
  p.id, p.slug, p.title, p.price, p.sale_price, p.is_on_sale, p.sale_ends_at,
  p.is_new, p.new_until, p.is_featured,
  image.id AS image_id, image.position AS image_position, image.public_key AS image_key,
  image.alt_text AS image_alt_text, image.width AS image_width, image.height AS image_height,
  category.id AS category_id, category.name AS category_name, category.slug AS category_slug`;

const CARD_JOINS = sql`
  JOIN LATERAL (
    SELECT id, position, public_key, alt_text, width, height
    FROM libreria.product_images
    WHERE product_id = p.id AND ${HAS_PUBLIC_VERSION}
    ORDER BY position
    LIMIT 1
  ) image ON true
  LEFT JOIN libreria.product_categories primary_assignment
    ON primary_assignment.product_id = p.id AND primary_assignment.is_primary
  LEFT JOIN libreria.categories category
    ON category.id = primary_assignment.category_id
    AND category.id IN (SELECT id FROM visible_categories)`;

interface MarkColumns {
  sale_price: string | null;
  is_on_sale: boolean;
  sale_ends_at: Date | string | null;
  is_new: boolean;
  new_until: Date | string | null;
}

interface CardRow extends MarkColumns {
  [column: string]: unknown;
  id: string;
  slug: string;
  title: string;
  price: string;
  is_featured: boolean;
  image_id: string;
  image_position: number;
  image_key: string;
  image_alt_text: string | null;
  image_width: number | null;
  image_height: number | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  /** Only in a listing page: how many match, counted with the same filter. */
  total_items?: number;
}

interface PageRow extends MarkColumns {
  [column: string]: unknown;
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: string;
  stock: number;
  is_featured: boolean;
}

interface ImageRow {
  [column: string]: unknown;
  id: string;
  position: number;
  public_key: string;
  alt_text: string | null;
  width: number | null;
  height: number | null;
}

interface AssignedCategoryRow {
  [column: string]: unknown;
  id: string;
  name: string;
  slug: string;
  is_primary: boolean;
  is_visible: boolean;
}

// Raw queries give timestamps as text.
const dateOf = (value: Date | string | null) =>
  value === null ? undefined : value instanceof Date ? value : new Date(value);

/** The sale and the "new" mark as they stand at `now`: one that ended does not count. */
function marksAt(row: MarkColumns, now: Date) {
  const saleEndsAt = dateOf(row.sale_ends_at);
  // The same rule as `Product.isSaleActive` and `isNewActive`.
  const isOnSale = row.is_on_sale && row.sale_price !== null && runsAt(saleEndsAt, now);
  return {
    isOnSale,
    salePrice: isOnSale ? row.sale_price : null,
    saleEndsAt: isOnSale ? (saleEndsAt ?? null) : null,
    isNew: row.is_new && runsAt(dateOf(row.new_until), now),
  };
}

async function rowsOf<T>(result: Promise<{ rows: T[] }>): Promise<T[]> {
  return (await result).rows;
}

const summaryOf = (category: AssignedCategoryRow): CategorySummaryResult => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
});

@Injectable()
export class DrizzleCatalogQueries extends CatalogQueries {
  constructor(
    private readonly executor: DrizzleExecutor,
    private readonly storage: FileStorage,
  ) {
    super();
  }

  async findPage(query: CatalogPageQuery, now: Date): Promise<Page<ProductCardResult>> {
    // The category and every visible one below it.
    const ctes =
      query.categorySlug === undefined
        ? sql`WITH RECURSIVE ${VISIBLE_CATEGORIES}`
        : sql`WITH RECURSIVE ${VISIBLE_CATEGORIES},
          branch AS (
            SELECT visible.id FROM visible_categories visible
            JOIN libreria.categories named ON named.id = visible.id
            WHERE named.slug = ${query.categorySlug}
            UNION
            SELECT visible.id FROM visible_categories visible
            JOIN branch ON visible.parent_id = branch.id
          )`;
    const filters = markFiltersOf(query, now);
    if (query.categorySlug !== undefined) {
      filters.push(sql`EXISTS (
        SELECT 1 FROM libreria.product_categories assigned
        WHERE assigned.product_id = p.id AND assigned.category_id IN (SELECT id FROM branch)
      )`);
    }
    if (query.words?.length) {
      filters.push(matchesEveryWord(sql`p.title`, query.words));
    }
    const filter = filters.length === 0 ? sql`true` : sql.join(filters, sql` AND `);

    // One query, so the page and its total come from the same snapshot and connection.
    const rows = await this.cardRows(
      ctes,
      sql`libreria.products p`,
      sql`${IS_LISTED} AND ${filter}`,
      sql`${STORE_ORDER} LIMIT ${query.limit} OFFSET ${offsetOf(query)}`,
      sql`, count(*) OVER ()::int AS total_items`,
    );
    // Past the last page there is no row to carry the total, so it is counted apart.
    const totalItems =
      rows[0]?.total_items ?? (query.page === 1 ? 0 : await this.countVisible(ctes, filter));
    return pageOf(
      rows.map((row) => this.cardOf(row, now)),
      totalItems,
      query,
    );
  }

  findFeatured(limit: number, now: Date): Promise<ProductCardResult[]> {
    return this.highlights(sql`p.is_featured`, limit, now);
  }

  findNew(limit: number, now: Date): Promise<ProductCardResult[]> {
    // The same rule as `runsAt`, so every card listed here also says it is new.
    return this.highlights(newMarkRunsAt(now), limit, now);
  }

  async findPageBySlug(slug: string, now: Date): Promise<ProductPage | null> {
    const [row] = await rowsOf(
      this.executor.current().execute<PageRow>(sql`
        SELECT p.id, p.slug, p.title, p.description, p.price, p.sale_price, p.is_on_sale,
          p.sale_ends_at, p.stock, p.is_featured, p.is_new, p.new_until
        FROM libreria.products p
        WHERE p.slug = ${slug} AND ${IS_VISIBLE}`),
    );
    if (!row) {
      return null;
    }

    const [images, assigned] = await Promise.all([
      rowsOf(
        this.executor.current().execute<ImageRow>(sql`
          SELECT id, position, public_key, alt_text, width, height
          FROM libreria.product_images
          WHERE product_id = ${row.id} AND ${HAS_PUBLIC_VERSION}
          ORDER BY position`),
      ),
      rowsOf(
        this.executor.current().execute<AssignedCategoryRow>(sql`
          WITH RECURSIVE ${VISIBLE_CATEGORIES}
          SELECT category.id, category.name, category.slug, assignment.is_primary,
            category.id IN (SELECT id FROM visible_categories) AS is_visible
          FROM libreria.product_categories assignment
          JOIN libreria.categories category ON category.id = assignment.category_id
          WHERE assignment.product_id = ${row.id}
          -- Like the category tree: ignoring case and accents.
          ORDER BY assignment.is_primary DESC,
            ${sortableName(sql`category.name`)}, category.id`),
      ),
    ]);
    const primary = assigned.find((category) => category.is_primary && category.is_visible);
    const marks = marksAt(row, now);

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      price: row.price,
      salePrice: marks.salePrice,
      isOnSale: marks.isOnSale,
      saleEndsAt: marks.saleEndsAt,
      stock: row.stock,
      isFeatured: row.is_featured,
      isNew: marks.isNew,
      images: images.map((image) =>
        this.imageOf({
          id: image.id,
          position: image.position,
          key: image.public_key,
          altText: image.alt_text,
          width: image.width,
          height: image.height,
        }),
      ),
      primaryCategory: primary ? summaryOf(primary) : null,
      categories: assigned.filter((category) => category.is_visible).map(summaryOf),
    };
  }

  async findManualRelated(
    productId: string,
    limit: number,
    now: Date,
  ): Promise<ProductCardResult[]> {
    const rows = await this.cardRows(
      sql`WITH RECURSIVE ${VISIBLE_CATEGORIES}`,
      sql`libreria.related_products manual JOIN libreria.products p ON p.id = manual.related_product_id`,
      sql`manual.product_id = ${productId} AND ${IS_LISTED}`,
      sql`manual.sort_order ASC, p.id ASC LIMIT ${limit}`,
    );
    return rows.map((row) => this.cardOf(row, now));
  }

  async findByPrimaryCategory(
    categoryId: string,
    excludeIds: string[],
    limit: number,
    now: Date,
  ): Promise<ProductCardResult[]> {
    const excluded =
      excludeIds.length === 0
        ? sql`true`
        : sql`p.id NOT IN (${sql.join(
            excludeIds.map((id) => sql`${id}`),
            sql`, `,
          )})`;
    const rows = await this.cardRows(
      sql`WITH RECURSIVE ${VISIBLE_CATEGORIES}`,
      sql`libreria.products p`,
      sql`${IS_LISTED} AND ${excluded} AND EXISTS (
        SELECT 1 FROM libreria.product_categories same
        WHERE same.product_id = p.id AND same.is_primary AND same.category_id = ${categoryId}
      )`,
      sql`${STORE_ORDER} LIMIT ${limit}`,
    );
    return rows.map((row) => this.cardOf(row, now));
  }

  async searchCards(
    words: readonly string[],
    text: string,
    limit: number,
    now: Date,
  ): Promise<ProductCardResult[]> {
    const rows = await this.cardRows(
      sql`WITH RECURSIVE ${VISIBLE_CATEGORIES}`,
      sql`libreria.products p`,
      sql`${IS_LISTED} AND ${matchesEveryWord(sql`p.title`, words)}`,
      sql`${startsWithText(sql`p.title`, text)} DESC, ${STORE_ORDER} LIMIT ${limit}`,
    );
    return rows.map((row) => this.cardOf(row, now));
  }

  /** The first visible products that match `mark`, in the store order. */
  private async highlights(mark: SQL, limit: number, now: Date): Promise<ProductCardResult[]> {
    const rows = await this.cardRows(
      sql`WITH RECURSIVE ${VISIBLE_CATEGORIES}`,
      sql`libreria.products p`,
      sql`${IS_LISTED} AND ${mark}`,
      sql`${STORE_ORDER} LIMIT ${limit}`,
    );
    return rows.map((row) => this.cardOf(row, now));
  }

  private cardRows(
    ctes: SQL,
    from: SQL,
    filter: SQL,
    orderAndLimit: SQL,
    extraColumns: SQL = sql``,
  ): Promise<CardRow[]> {
    return rowsOf(
      this.executor.current().execute<CardRow>(sql`
        ${ctes}
        SELECT ${CARD_COLUMNS} ${extraColumns}
        FROM ${from}
        ${CARD_JOINS}
        WHERE ${filter}
        ORDER BY ${orderAndLimit}`),
    );
  }

  private async countVisible(ctes: SQL, filter: SQL): Promise<number> {
    const [row] = await rowsOf(
      this.executor.current().execute<{ [column: string]: unknown; total: number }>(sql`
        ${ctes}
        SELECT count(*)::int AS total FROM libreria.products p
        WHERE ${IS_VISIBLE} AND ${filter}`),
    );
    return row.total;
  }

  private cardOf(row: CardRow, now: Date): ProductCardResult {
    const marks = marksAt(row, now);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      price: row.price,
      salePrice: marks.salePrice,
      isOnSale: marks.isOnSale,
      isNew: marks.isNew,
      isFeatured: row.is_featured,
      image: this.imageOf({
        id: row.image_id,
        position: row.image_position,
        key: row.image_key,
        altText: row.image_alt_text,
        width: row.image_width,
        height: row.image_height,
      }),
      category:
        row.category_id === null
          ? null
          : { id: row.category_id, name: row.category_name ?? "", slug: row.category_slug ?? "" },
    };
  }

  private imageOf(image: {
    id: string;
    position: number;
    key: string;
    altText: string | null;
    width: number | null;
    height: number | null;
  }): ProductImageResult {
    return {
      id: image.id,
      position: image.position,
      url: this.storage.publicUrl(image.key),
      altText: image.altText,
      width: image.width,
      height: image.height,
    };
  }
}
