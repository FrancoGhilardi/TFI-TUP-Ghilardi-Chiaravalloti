import type { CategoryOption } from "./category-option";

/**
 * The categories below `id`: the ones that come right after it in tree order while they are
 * deeper than it. They end at the first category as shallow as `id`, which is its next sibling
 * or something above.
 */
export function descendantIdsOf(options: readonly CategoryOption[], id: string): string[] {
  const start = options.findIndex((option) => option.id === id);
  if (start < 0) {
    return [];
  }
  const { depth } = options[start];
  const found: string[] = [];
  for (let index = start + 1; index < options.length && options[index].depth > depth; index++) {
    found.push(options[index].id);
  }
  return found;
}

/**
 * The categories that may be the parent of the one being edited: all but itself and everything
 * below it, which would close a cycle. Creating (no `editingId`) leaves none out.
 */
export function selectableParents(
  options: readonly CategoryOption[],
  editingId?: string,
): CategoryOption[] {
  if (editingId === undefined) {
    return [...options];
  }
  const excluded = new Set([editingId, ...descendantIdsOf(options, editingId)]);
  return options.filter(({ id }) => !excluded.has(id));
}

/** The categories with an inactive one above them, which the store hides along with it. */
export function hiddenIds(options: readonly CategoryOption[]): Set<string> {
  const hidden = new Set<string>();
  /** For each level, whether the last category seen there or one above it is inactive. */
  const blocked: boolean[] = [];
  for (const { id, depth, isActive } of options) {
    const parentBlocked = depth > 0 && (blocked[depth - 1] ?? false);
    if (parentBlocked) {
      hidden.add(id);
    }
    blocked.length = depth;
    blocked[depth] = parentBlocked || !isActive;
  }
  return hidden;
}

/** The categories that have subcategories: each one is followed by something deeper. */
export function idsWithChildren(options: readonly CategoryOption[]): Set<string> {
  const parents = new Set<string>();
  options.forEach((option, index) => {
    if ((options[index + 1]?.depth ?? 0) > option.depth) {
      parents.add(option.id);
    }
  });
  return parents;
}
