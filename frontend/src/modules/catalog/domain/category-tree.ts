import type { CategoryNode } from "./category";

export interface CategoryPath {
  /** From the first-level category down to the selected one, both included. */
  trail: CategoryNode[];
  selected: CategoryNode;
}

function trailTo(node: CategoryNode, slug: string): CategoryNode[] | undefined {
  if (node.slug === slug) {
    return [node];
  }
  for (const child of node.children) {
    const below = trailTo(child, slug);
    if (below) {
      return [node, ...below];
    }
  }
  return undefined;
}

/** Locates a category by slug at any depth, with every category above it. */
export function findCategoryPath(tree: CategoryNode[], slug: string): CategoryPath | undefined {
  for (const root of tree) {
    const trail = trailTo(root, slug);
    if (trail) {
      return { trail, selected: trail[trail.length - 1] };
    }
  }
  return undefined;
}
