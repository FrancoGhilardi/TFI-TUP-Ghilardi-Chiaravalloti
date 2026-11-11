import type { StockStatus } from "../domain/product-stock";

/** Copy of the product page, kept apart so it can change without touching UI. */
export const productDetailContent = {
  breadcrumb: { label: "Migas de pan", home: "Inicio", products: "Productos" },
  gallery: {
    photo: (position: number, total: number) => `Ver foto ${position} de ${total}`,
  },
  price: { previous: "Precio anterior: ", sale: "Oferta" },
  stock: (status: StockStatus) => {
    switch (status.kind) {
      case "out":
        return "Sin stock";
      case "low":
        return status.units === 1 ? "¡Última unidad!" : `¡Últimas ${status.units} unidades!`;
      case "in":
        return `${status.units} en stock`;
    }
  },
  inquiry: "Consultar",
  notes: [
    "Reservás online y retirás en el local de Mendoza.",
    "¿Necesitás impresiones o anillado? Sumalo a tu consulta por WhatsApp.",
  ],
  related: { eyebrow: "También te puede gustar", title: "Productos similares" },
  /** Said to assistive technology while the grey blocks stand in for the page. */
  loading: "Cargando el producto",
  notFound: {
    title: "No encontramos este producto",
    body: "Puede que ya no esté disponible. Mirá el resto del catálogo.",
    action: "Ver todos los productos",
  },
  error: {
    title: "No pudimos cargar el producto",
    body: "Hubo un problema al buscarlo. Probá de nuevo en un momento.",
    retry: "Reintentar",
    action: "Ver todos los productos",
  },
} as const;
