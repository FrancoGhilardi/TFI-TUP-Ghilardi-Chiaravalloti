/** Public path of the catalog. */
export const CATALOG_PATH = "/productos";

export function productHref(slug: string): string {
  return `${CATALOG_PATH}/${encodeURIComponent(slug)}`;
}
