import type { Page } from "../../../../shared/application/pagination.js";
import type { ProductCardResult } from "../dto/product-card.result.js";
import type { ProductPage } from "../dto/product-detail.result.js";
import type { CatalogPageQuery } from "../dto/catalog-page.query.js";

/**
 * Reads the store. Every operation only sees visible products: active, not deleted and with an
 * image that has a public version, which a processed image has and one being processed again
 * keeps. `now` tells which sales and "new" marks still run. Listings follow the store order:
 * position, then the newest first.
 */
export abstract class CatalogQueries {
  abstract findPage(query: CatalogPageQuery, now: Date): Promise<Page<ProductCardResult>>;

  /** Visible featured products. */
  abstract findFeatured(limit: number, now: Date): Promise<ProductCardResult[]>;

  /** Visible products whose "new" mark still runs at `now`. */
  abstract findNew(limit: number, now: Date): Promise<ProductCardResult[]>;

  /** The visible product with that slug, or `null`. */
  abstract findPageBySlug(slug: string, now: Date): Promise<ProductPage | null>;

  /** The visible related products set by hand for the product, in their order. */
  abstract findManualRelated(
    productId: string,
    limit: number,
    now: Date,
  ): Promise<ProductCardResult[]>;

  /** Visible products with that primary category, leaving out `excludeIds`. */
  abstract findByPrimaryCategory(
    categoryId: string,
    excludeIds: string[],
    limit: number,
    now: Date,
  ): Promise<ProductCardResult[]>;

  /**
   * Visible products whose title has every word, in any order and ignoring case and accents.
   * Those whose title starts with `text` come first, then the store order.
   */
  abstract searchCards(
    words: readonly string[],
    text: string,
    limit: number,
    now: Date,
  ): Promise<ProductCardResult[]>;
}
