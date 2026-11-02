/** Public path of the catalog; its query parameters are part of the store's public URLs. */
export const CATALOG_PATH = "/productos";

export function productHref(slug: string): string {
  return `${CATALOG_PATH}/${encodeURIComponent(slug)}`;
}

export function categoryHref(slug: string): string {
  return `${CATALOG_PATH}?categoria=${encodeURIComponent(slug)}`;
}

export const FEATURED_CATALOG_HREF = `${CATALOG_PATH}?destacados=true`;
export const NEW_ARRIVALS_CATALOG_HREF = `${CATALOG_PATH}?novedades=true`;
