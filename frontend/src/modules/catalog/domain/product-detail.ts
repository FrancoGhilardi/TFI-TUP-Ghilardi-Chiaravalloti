import type { CartProduct } from "@/modules/cart";

import { currentPrice, type ProductCard, type ProductPricing } from "./product-card";
import { productHref } from "./product-routes";

export interface ProductDetailImage {
  id: string;
  url: string;
  /** Text alternative, never empty: the product title when the image has none. */
  alt: string;
  /** Whether the image comes from the configured Storage and can go through the image optimizer. */
  optimizable: boolean;
}

/** A product as its own page shows it. */
export interface ProductDetail extends ProductPricing {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  /** Units for sale, `0` when there are none. */
  stock: number;
  /** At least one: a product without a processed image is not visible in the store. */
  images: ProductDetailImage[];
  /** Primary category, or `null` while it is hidden from the store. */
  category: { name: string; slug: string } | null;
  /** Up to four, manual ones first. */
  related: ProductCard[];
}

/** Absolute address of the product page, for links that leave the store (a WhatsApp message). */
export function productPageUrl(siteOrigin: string, slug: string): string {
  return new URL(productHref(slug), siteOrigin).toString();
}

/** The product as the cart keeps it: what the customer pays now, and the stock that limits them. */
export function cartProductOf(product: ProductDetail): CartProduct {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    price: currentPrice(product),
    stock: product.stock,
    imageUrl: product.images[0].url,
  };
}
