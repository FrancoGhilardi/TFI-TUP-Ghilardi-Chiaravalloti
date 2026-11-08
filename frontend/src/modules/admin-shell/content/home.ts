import { LOW_STOCK_MAX } from "@/modules/admin-products";

/** Copy of the panel's home, kept apart so it can change without touching UI. */
export const homeContent = {
  greeting: "¡Hola,",
  lead: "Esto es lo que pasa hoy en el catálogo de la librería.",
  stats: {
    activeProducts: "Productos activos",
    inactiveProducts: "Productos inactivos",
    lowStock: `Con stock bajo (≤ ${LOW_STOCK_MAX})`,
    activeCategories: "Categorías activas",
    failed: "No se pudo cargar",
  },
  recent: {
    title: "Últimos productos modificados",
    action: "Ver todos",
    empty: "Todavía no hay productos.",
    active: "Activo",
    inactive: "Inactivo",
  },
  lowStock: {
    title: "Stock bajo",
    action: "Ver listado",
    empty: "Todo con stock suficiente.",
    outOfStock: "Sin stock",
    units: (stock: number) => `${stock} u.`,
  },
  shortcuts: {
    title: "Atajos",
    product: "Cargar un producto",
    category: "Crear una categoría",
    user: "Dar de alta un usuario",
  },
  error: {
    block: "No pudimos cargar esta sección.",
    retry: "Reintentar",
  },
} as const;
