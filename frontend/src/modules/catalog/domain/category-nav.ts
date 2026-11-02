import { catalogHref, type CatalogQuery } from "./catalog-query";
import type { CategoryNode } from "./category";
import { findCategoryPath } from "./category-tree";

/** A category as the catalog navigation shows it, already linked for the current query. */
export interface CategoryNavItem {
  id: string;
  name: string;
  href: string;
  active: boolean;
  /** Whether its subcategories start shown: only on the way to the selected category. */
  expanded: boolean;
  children: CategoryNavItem[];
}

/** The whole tree, each link keeping the search, filters and sort of `query`. */
export function categoryNavItems(tree: CategoryNode[], query: CatalogQuery): CategoryNavItem[] {
  const trail = query.category ? (findCategoryPath(tree, query.category)?.trail ?? []) : [];
  const open = new Set(trail.map((category) => category.id));

  const toItem = (category: CategoryNode): CategoryNavItem => ({
    id: category.id,
    name: category.name,
    href: catalogHref(query, { category: category.slug }),
    active: query.category === category.slug,
    expanded: category.children.length > 0 && open.has(category.id),
    children: category.children.map(toItem),
  });
  return tree.map(toItem);
}
