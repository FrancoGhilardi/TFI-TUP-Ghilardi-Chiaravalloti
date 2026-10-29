import type { PageRequest } from "../../../../shared/application/pagination.js";

/** A page of the store listing as the queries read it, with the search words already picked. */
export interface CatalogPageQuery extends PageRequest {
  /** Only products in that category or below it; a hidden or unknown one matches none. */
  categorySlug?: string;
  /** Every one in the title, in any order, ignoring case and accents. */
  words?: string[];
}
