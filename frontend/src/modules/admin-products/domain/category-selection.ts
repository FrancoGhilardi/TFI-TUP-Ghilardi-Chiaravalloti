export interface CategorySelection {
  categoryIds: string[];
  /** Empty while no category is chosen. */
  primaryCategoryId: string;
}

/** The primary one stays if it is still chosen; if not, the first of those left takes its place. */
export function nextPrimary(chosen: readonly string[], primary: string): string {
  return chosen.includes(primary) ? primary : (chosen[0] ?? "");
}

/** Adds the category if it is not chosen and removes it if it is; the first chosen is primary. */
export function toggleCategory(
  { categoryIds, primaryCategoryId }: CategorySelection,
  id: string,
): CategorySelection {
  const chosen = categoryIds.includes(id)
    ? categoryIds.filter((current) => current !== id)
    : [...categoryIds, id];
  return { categoryIds: chosen, primaryCategoryId: nextPrimary(chosen, primaryCategoryId) };
}
