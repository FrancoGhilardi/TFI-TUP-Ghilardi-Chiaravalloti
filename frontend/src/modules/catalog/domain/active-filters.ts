import { type CatalogQuery } from "./catalog-query";
import type { CategoryNode } from "./category";
import { findCategoryPath } from "./category-tree";

export type ActiveFilterKind = "search" | "category" | "featured" | "newArrivals";

export interface ActiveFilter {
  kind: ActiveFilterKind;
  /** What the filter holds: the search text or the category name; empty for flags. */
  value?: string;
  /** The query once this filter is removed. */
  without: Partial<CatalogQuery>;
}

/** The filters the visitor applied, in the order they are shown, each with how to remove it. */
export function activeFilters(query: CatalogQuery, tree: CategoryNode[]): ActiveFilter[] {
  const filters: ActiveFilter[] = [];
  if (query.q) {
    filters.push({ kind: "search", value: query.q, without: { q: undefined } });
  }
  if (query.category) {
    // The name when the tree knows the category; the slug keeps the chip readable otherwise.
    const name = findCategoryPath(tree, query.category)?.selected.name ?? query.category;
    filters.push({ kind: "category", value: name, without: { category: undefined } });
  }
  if (query.featured) {
    filters.push({ kind: "featured", without: { featured: false } });
  }
  if (query.newArrivals) {
    filters.push({ kind: "newArrivals", without: { newArrivals: false } });
  }
  return filters;
}
