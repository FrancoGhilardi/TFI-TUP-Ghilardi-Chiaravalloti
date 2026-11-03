import type { SyncNotice } from "../domain/cart";

/** Copy of the cart, kept apart so it can change without touching UI. */
export const cartContent = {
  quantity: {
    label: "Cantidad",
    less: "Quitar uno",
    more: "Sumar uno",
    /** Names the control after its product, for lists where several selectors share a page. */
    of: (text: string, title: string) => `${text} de «${title}»`,
  },
  add: "Agregar al carrito",
  quickAdd: "Agregar",
  drawer: {
    title: "Tu carrito",
    empty: "Todavía no agregaste productos.",
    browse: "Ver productos",
    remove: (title: string) => `Quitar «${title}» del carrito`,
    unitPrice: (price: string) => `${price} c/u`,
    total: "Total",
    order: "Pedir por WhatsApp",
    clear: "Vaciar carrito",
    confirmClear: "¿Vaciar el carrito?",
    confirmYes: "Sí, vaciar",
    confirmNo: "Cancelar",
  },
  outOfStock: "Sin stock",
  added: (added: number, requested: number) =>
    added < requested
      ? `Agregaste ${added} al carrito. Ya tenés todas las unidades disponibles.`
      : `Agregaste ${added} al carrito`,
  allInCart: "Ya tenés en el carrito todas las unidades disponibles",
  sync: (notice: SyncNotice) =>
    notice.kind === "adjusted"
      ? `Ajustamos la cantidad de «${notice.title}» en tu carrito al stock disponible: ${notice.quantity}`
      : `Sacamos «${notice.title}» de tu carrito porque ya no tiene stock`,
} as const;
