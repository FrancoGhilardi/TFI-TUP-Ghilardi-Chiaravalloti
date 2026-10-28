import { RELATED_PRODUCTS_MAX } from "../../domain/catalog-limits.js";

/** Fixed values of the store listings; none of them changes between environments. */
export class CatalogSettings {
  readonly defaultPageSize = 20;
  readonly maxPageSize = 50;
  /** Featured and new products shown on the home page, each. */
  readonly highlightsLimit = 5;
  /** Related products shown on a product page; as many as can be set by hand. */
  readonly relatedLimit = RELATED_PRODUCTS_MAX;
}
