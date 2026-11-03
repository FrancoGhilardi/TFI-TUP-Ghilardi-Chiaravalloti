import type { SearchSuggestions } from "../domain/search-term";

/** Copy of the header search, kept apart so it can change without touching UI. */
export const searchContent = {
  trigger: "Buscar",
  title: "Buscar",
  label: "Buscar productos y categorías",
  placeholder: "Buscá un libro, un cuaderno, una marca…",
  hint: "Escribí al menos 2 letras o números.",
  loading: "Buscando…",
  empty: (term: string) => `No encontramos resultados para «${term}».`,
  error: "No pudimos buscar ahora. Probá de nuevo.",
  retry: "Reintentar",
  groups: { products: "Productos", categories: "Categorías" },
  seeAll: (term: string) => `Ver todos los resultados para «${term}»`,
  /** Read out by screen readers after each search. */
  announcement: {
    none: "Sin resultados",
    failed: "No pudimos buscar ahora",
    found: ({ products, categories }: SearchSuggestions) =>
      `${products.length} ${products.length === 1 ? "producto" : "productos"} y ${categories.length} ${categories.length === 1 ? "categoría" : "categorías"}`,
  },
} as const;
