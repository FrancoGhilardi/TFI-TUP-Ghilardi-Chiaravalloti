import type { PageRequest } from "../../../../shared/application/pagination.js";
import type { Money } from "../../../../shared/domain/value-objects/money.js";
import type { ProductSort } from "./search-catalog.query.js";

/** A page of the store listing as the queries read it, with the search words already picked. */
export interface CatalogPageQuery extends PageRequest {
  /** Only products in that category or below it; a hidden or unknown one matches none. */
  categorySlug?: string;
  /** Every one in the title, in any order, ignoring case and accents. */
  words?: string[];
  /** The words, as one text: by relevance, the titles that start with it go first. */
  text?: string;
  isFeatured?: boolean;
  /** A "new" mark counts only while it runs at `now`. */
  isNew?: boolean;
  /** A sale counts only while it runs at `now`. */
  isOnSale?: boolean;
  inStock?: boolean;
  /** Both ends included, on the price at `now`: the sale one while the sale runs. */
  minPrice?: Money;
  maxPrice?: Money;
  sort: ProductSort;
}
