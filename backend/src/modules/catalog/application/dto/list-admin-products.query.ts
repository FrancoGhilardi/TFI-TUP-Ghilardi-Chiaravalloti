import type {
  PageRequest,
  RecordStatusFilter,
  SortDirection,
} from "../../../../shared/application/pagination.js";

export enum AdminProductSortField {
  TITLE = "TITLE",
  SKU = "SKU",
  /** The regular price, not the sale one. */
  PRICE = "PRICE",
  STOCK = "STOCK",
  CREATED_AT = "CREATED_AT",
  UPDATED_AT = "UPDATED_AT",
}

/**
 * A page of the panel's product list. Without `sortBy`, by the last change; without
 * `sortDir`, descending for that default and ascending for a field chosen. Ties always go by
 * title, ignoring case and accents, and then by id.
 */
export interface ListAdminProductsQuery extends PageRequest {
  /** Part of the title, ignoring case and accents, or of the SKU; blank searches nothing. */
  q?: string;
  /** Products with that category among theirs, or any current one below it. */
  categoryId?: string;
  /** Without one, the products not deleted, active or not. */
  status?: RecordStatusFilter;
  isFeatured?: boolean;
  /** A sale or "new" mark counts only while it runs at the time of the query. */
  isOnSale?: boolean;
  isNew?: boolean;
  /** Products with this stock or less. */
  maxStock?: number;
  sortBy?: AdminProductSortField;
  sortDir?: SortDirection;
}
