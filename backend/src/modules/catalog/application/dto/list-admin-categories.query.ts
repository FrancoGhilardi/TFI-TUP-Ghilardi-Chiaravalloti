import type {
  PageRequest,
  RecordStatusFilter,
  SortDirection,
} from "../../../../shared/application/pagination.js";

export enum CategorySortField {
  NAME = "NAME",
  SORT_ORDER = "SORT_ORDER",
  CREATED_AT = "CREATED_AT",
  UPDATED_AT = "UPDATED_AT",
}

/**
 * Without `sortBy`, `q` or `parentId`, the listing follows the tree: each category right
 * before its subcategories, siblings by position, name and id, and `sortDir` does not apply.
 * Otherwise it is flat, by `sortBy` (the name when absent), with the name and the id to
 * break ties.
 */
export interface ListAdminCategoriesQuery extends PageRequest {
  /** Part of the name or the slug, ignoring case and accents; blank searches nothing. */
  q?: string;
  /** Only the direct subcategories of that one. */
  parentId?: string;
  /** Without one, the categories not deleted, active or not. */
  status?: RecordStatusFilter;
  sortBy?: CategorySortField;
  sortDir: SortDirection;
}
