/** Copy of the catalog page, kept apart so it can change without touching UI. */
export const catalogContent = {
  eyebrow: "Catálogo",
  title: "Nuestros productos",
  categories: {
    label: "Categorías",
    all: "Todos",
    toggle: (name: string) => `Subcategorías de ${name}`,
  },
  search: {
    label: "Buscar en el catálogo",
    placeholder: "Buscar en el catálogo…",
    submit: "Buscar",
    tooShort: "Escribí al menos 2 letras o números.",
  },
  sort: { label: "Ordenar por", apply: "Aplicar" },
  filters: {
    search: (q: string) => `Búsqueda: ${q}`,
    featured: "Destacados",
    newArrivals: "Novedades",
    remove: (label: string) => `Quitar filtro ${label}`,
    clear: "Limpiar filtros",
  },
  total: (count: number) => `${count} ${count === 1 ? "producto" : "productos"}`,
  /** Read out by screen readers after each search or filter change. */
  announcement: {
    empty: "Sin resultados",
    outOfRange: "Esta página no tiene productos",
    error: "No se pudieron cargar los productos",
  },
  empty: {
    title: "No encontramos productos",
    forSearch: (q: string) => `No encontramos productos para «${q}»`,
    body: "Probá con otra búsqueda o mirá todo el catálogo. Si no lo ves, preguntanos: puede que lo tengamos.",
    showAll: "Ver todos los productos",
    ask: "Consultanos por WhatsApp",
  },
  outOfRange: {
    title: "Esta página no tiene productos",
    toFirst: "Ir a la primera página",
  },
  error: {
    title: "No pudimos cargar los productos",
    body: "Puede ser un problema de conexión. Probá de nuevo en unos segundos.",
    retry: "Reintentar",
  },
} as const;
