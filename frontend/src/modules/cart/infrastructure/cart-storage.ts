import { z } from "zod";

import { DECIMAL_PRICE } from "@/modules/core/formatters/price";

import type { CartItem } from "../domain/cart";

/** Key of the cart in `localStorage`; the version changes only if the stored shape does. */
export const CART_STORAGE_KEY = "lms-cart-v1";

const storedItemSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  price: z.string().regex(DECIMAL_PRICE),
  stock: z.number().int().min(0),
  imageUrl: z.string(),
  quantity: z.number().int().min(1),
});

/**
 * The items kept in the browser, which anyone can edit or an older version can have written:
 * what does not have the expected shape, or repeats a product, is left out instead of breaking
 * the page. The quantity is held to the stock, as the cart never holds more, and a product
 * with no stock is left out.
 */
export function restoreItems(stored: unknown): CartItem[] {
  if (!Array.isArray(stored)) {
    return [];
  }
  const items = new Map<string, CartItem>();
  for (const candidate of stored) {
    const result = storedItemSchema.safeParse(candidate);
    if (result.success && result.data.stock > 0 && !items.has(result.data.id)) {
      const { stock, quantity } = result.data;
      items.set(result.data.id, { ...result.data, quantity: Math.min(quantity, stock) });
    }
  }
  return [...items.values()];
}
