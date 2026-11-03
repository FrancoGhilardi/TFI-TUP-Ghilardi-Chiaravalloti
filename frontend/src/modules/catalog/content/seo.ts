/** Text of the catalog and product pages for search engines and link previews. */
export const catalogSeo = {
  title: "Productos",
  description:
    "Explorá el catálogo de Librería Mi Sueño: libros, útiles, artística e impresiones. Reservá por WhatsApp y retirá en el local.",
  categoryDescription: (name: string) =>
    `Productos de ${name} en Librería Mi Sueño. Reservá por WhatsApp y retirá en el local.`,
  productDescription: (title: string, categoryName: string | undefined) =>
    `${title}${categoryName ? ` en ${categoryName}` : ""}. Reservá por WhatsApp y retirá en el local.`,
  productNotFound: "Producto no encontrado",
} as const;
