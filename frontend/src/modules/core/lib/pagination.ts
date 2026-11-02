export type PaginationItem = { type: "page"; page: number } | { type: "gap"; key: string };

/** Pages shown on each side of the current one before collapsing the rest into a gap. */
const NEIGHBORS = 1;

/**
 * The page links to show: always the first and last pages, the current one and its neighbors,
 * and a gap wherever pages are left out (1 … 4 5 6 … 20).
 */
export function paginationItems(current: number, total: number): PaginationItem[] {
  if (total <= 1) {
    return [];
  }
  const pages = new Set([1, total]);
  for (let page = current - NEIGHBORS; page <= current + NEIGHBORS; page++) {
    if (page >= 1 && page <= total) {
      pages.add(page);
    }
  }
  // A gap that would hide a single page shows that page instead.
  for (const page of [2, total - 1]) {
    if (pages.has(page - 1) && pages.has(page + 1)) {
      pages.add(page);
    }
  }

  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((page, index): PaginationItem[] => {
    const previous = sorted[index - 1];
    const item: PaginationItem = { type: "page", page };
    return previous !== undefined && page - previous > 1
      ? [{ type: "gap", key: `gap-${previous}` }, item]
      : [item];
  });
}
