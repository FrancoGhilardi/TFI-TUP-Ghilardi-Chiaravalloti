export type CategoryIconKey =
  "books" | "school" | "notebooks" | "art" | "backpacks" | "gifts" | "generic";

/** Icons are chosen in the frontend by slug; categories the map does not know get a generic one. */
const ICON_BY_SLUG: Record<string, CategoryIconKey> = {
  libros: "books",
  "utiles-escolares": "school",
  "cuadernos-y-agendas": "notebooks",
  "arte-y-pintura": "art",
  "mochilas-y-cartucheras": "backpacks",
  regaleria: "gifts",
};

export function categoryIconKey(slug: string): CategoryIconKey {
  return ICON_BY_SLUG[slug] ?? "generic";
}
