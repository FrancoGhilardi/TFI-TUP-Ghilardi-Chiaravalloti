import type { SyncNotice } from "../domain/cart";

/** Copy of the cart, kept apart so it can change without touching UI. */
export const cartContent = {
  quantity: { label: "Cantidad", less: "Quitar uno", more: "Sumar uno" },
  add: "Agregar al carrito",
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
