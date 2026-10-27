import type { Page } from "../../../../shared/application/pagination.js";
import type { ProductCardResult } from "../dto/product-card.result.js";
import type { ProductPage } from "../dto/product-detail.result.js";
import type { SearchCatalogQuery } from "../dto/search-catalog.query.js";

/**
 * Reads the store. Every operation only sees visible products: active, not deleted and with a
 * processed image. `now` tells which sales and "new" marks still run. Listings follow the
 * store order: position, then the newest first.
 */
export abstract class CatalogQueries {
  abstract findPage(query: SearchCatalogQuery, now: Date): Promise<Page<ProductCardResult>>;

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
}
