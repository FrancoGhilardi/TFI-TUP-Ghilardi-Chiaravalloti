/** A category visible in the store, with its visible subcategories in display order. */
export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  children: CategoryNode[];
}

/** First-level categories in display order, without their subtrees. */
export function rootCategories(tree: CategoryNode[]): CategoryNode[] {
  return tree.map((node) => ({ ...node, children: [] }));
}
