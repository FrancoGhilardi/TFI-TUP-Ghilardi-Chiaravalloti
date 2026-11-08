/** A category as the products filter lists it. */
export interface CategoryOption {
  id: string;
  label: string;
  /** A hidden category exists but cannot be given to a product. */
  isActive: boolean;
}

interface OptionSource {
  id: string;
  name: string;
  /** 0 for a root category. */
  depth: number;
  isActive: boolean;
}

/** The name indented by its level, so the tree can be read in a flat list, and marked if hidden. */
export function categoryOptionOf({ id, name, depth, isActive }: OptionSource): CategoryOption {
  const indent = "\u2003".repeat(depth);
  return { id, label: `${indent}${name}${isActive ? "" : " (inactiva)"}`, isActive };
}
