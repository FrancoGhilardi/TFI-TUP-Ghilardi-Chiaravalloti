/** The store routes under /products that a slug could be mistaken for. */
export const STORE_PRODUCT_ROUTES = {
  featured: "featured",
  new: "new",
} as const;

/** No product may take these slugs; the database checks them too. */
export const RESERVED_PRODUCT_SLUGS: readonly string[] = Object.values(STORE_PRODUCT_ROUTES);
