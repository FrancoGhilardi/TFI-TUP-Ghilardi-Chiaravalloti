/** Fixed values of the store listings; none of them changes between environments. */
export class CatalogSettings {
  readonly defaultPageSize = 20;
  readonly maxPageSize = 50;
  /** Related products shown on a product page. */
  readonly relatedLimit = 4;
}
