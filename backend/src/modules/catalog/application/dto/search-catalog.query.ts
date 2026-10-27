import type { PageRequest } from "../../../../shared/application/pagination.js";

/** A page of the store listing. */
export interface SearchCatalogQuery extends PageRequest {
  /** Only products in that category or below it; a hidden or unknown one matches none. */
  categorySlug?: string;
}
