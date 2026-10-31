import type { PageRequest } from "../../../../shared/application/pagination.js";

/** A page of the store listing. */
export interface SearchCatalogQuery extends PageRequest {
  /** Only products in that category or below it; a hidden or unknown one matches none. */
  categorySlug?: string;
  /** Only products whose title has every word of it, as the store search box finds them. */
  q?: string;
  isFeatured?: boolean;
  /** A "new" mark counts only while it runs at the time of the query. */
  isNew?: boolean;
}
