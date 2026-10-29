import { RELATED_PRODUCTS_MAX } from "../../domain/catalog-limits.js";

/** Fixed values of the store listings; none of them changes between environments. */
export class CatalogSettings {
  readonly defaultPageSize = 20;
  readonly maxPageSize = 50;
  /** The last page the store lists: beyond it nobody browses, and it would only cost reads. */
  readonly maxPage = 500;
  /** Featured and new products shown on the home page, each. */
  readonly highlightsLimit = 5;
  /** Related products shown on a product page; as many as can be set by hand. */
  readonly relatedLimit = RELATED_PRODUCTS_MAX;
  /** Products and categories the search box brings, each, unless it asks for fewer or more. */
  readonly searchDefaultLimit = 5;
  readonly searchMaxLimit = 10;
  /** Shorter words of a search are left out, and only the first distinct ones are looked for. */
  readonly searchMinWordLength = 2;
  readonly searchMaxWords = 5;
}
