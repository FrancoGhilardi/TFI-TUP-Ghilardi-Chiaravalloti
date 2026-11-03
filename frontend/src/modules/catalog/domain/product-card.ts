export interface ProductCardImage {
  url: string;
  /** Text alternative, never empty: the product title when the image has none. */
  alt: string;
  /** Whether the image comes from the configured Storage and can go through the image optimizer. */
  optimizable: boolean;
}

/** A product as listed in the store: grids, sections and similar products. */
export interface ProductCard {
  id: string;
  slug: string;
  title: string;
  /** Regular price, as decimal text such as `"1500.50"`. */
  price: string;
  /** Running sale price, or `null` without a running sale. */
  salePrice: string | null;
  /** Units in stock; the card offers to add the product only while there are any. */
  stock: number;
  isOnSale: boolean;
  isNew: boolean;
  isFeatured: boolean;
  image: ProductCardImage;
  /** Primary category, or `null` while it is hidden from the store. */
  category: { name: string; slug: string } | null;
}

export type ProductPricing = Pick<ProductCard, "price" | "salePrice" | "isOnSale">;

/** Whether the product shows a sale price next to the struck regular one. */
export function hasRunningSale(product: Pick<ProductPricing, "salePrice" | "isOnSale">): boolean {
  return product.isOnSale && product.salePrice !== null;
}

/** The price the customer pays now: the running sale price, or the regular one. */
export function currentPrice(product: ProductPricing): string {
  return product.isOnSale && product.salePrice !== null ? product.salePrice : product.price;
}
