import type { PageRequest } from "../../../../shared/application/pagination.js";

/** How the store listing is sorted; a price is the one a card shows, on sale or not. */
export enum ProductSort {
  /** With a search, the titles that start with it first; then the store order. */
  RELEVANCE = "RELEVANCE",
  PRICE_ASC = "PRICE_ASC",
  PRICE_DESC = "PRICE_DESC",
  NEWEST = "NEWEST",
  TITLE_ASC = "TITLE_ASC",
}

/** A page of the store listing. */
export interface SearchCatalogQuery extends PageRequest {
  /** Only products in that category or below it; a hidden or unknown one matches none. */
  categorySlug?: string;
  /** Only products whose title has every word of it, as the store search box finds them. */
  q?: string;
  isFeatured?: boolean;
  /** A "new" mark counts only while it runs at the time of the query. */
  isNew?: boolean;
  /** A sale counts only while it runs at the time of the query. */
  isOnSale?: boolean;
  inStock?: boolean;
  /** Decimal text, as "1500.50"; both ends included, on the price the card shows. */
  minPrice?: string;
  maxPrice?: string;
  /** `RELEVANCE` when left out. */
  sort?: ProductSort;
}
