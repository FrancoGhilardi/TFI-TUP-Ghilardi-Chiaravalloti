import type { CategoryTreeResult } from "../dto/category-tree.result.js";

/** A visible category as read, before it is placed in the tree. */
export interface CategoryTreeRow {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
}

const compare = (a: CategoryTreeRow, b: CategoryTreeRow) =>
  a.sortOrder - b.sortOrder ||
  a.name.localeCompare(b.name, "es", { sensitivity: "base" }) ||
  a.id.localeCompare(b.id);

/**
 * Builds the tree from the roots down, ordering each level by sort order, then name, then id.
 * A category whose parent is not among the rows (inactive or deleted) is left out with all
 * the ones under it. Each category has a single parent and the walk starts at the roots, so a
 * loop left in the data is never reached and cannot make it loop either.
 */
export function buildCategoryTree(rows: CategoryTreeRow[]): CategoryTreeResult[] {
  const childrenOf = new Map<string | null, CategoryTreeRow[]>();
  for (const row of rows) {
    const siblings = childrenOf.get(row.parentId) ?? [];
    siblings.push(row);
    childrenOf.set(row.parentId, siblings);
  }

  const nodesUnder = (parentId: string | null): CategoryTreeResult[] =>
    (childrenOf.get(parentId) ?? []).sort(compare).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      // A blank description stored by hand means none.
      description: row.description?.trim() ? row.description : null,
      children: nodesUnder(row.id),
    }));

  return nodesUnder(null);
}
