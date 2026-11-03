/** What the cart needs to know about a product, as the product page shows it. */
export interface CartProduct {
  id: string;
  slug: string;
  title: string;
  /** Price the customer pays now, as decimal text such as `"1500.50"`. */
  price: string;
  stock: number;
  imageUrl: string;
}

/** A product in the cart: a copy of what it looked like when last seen, and how many. */
export interface CartItem extends CartProduct {
  quantity: number;
}

export interface AddToCartResult {
  items: CartItem[];
  /** Units that went in: fewer than asked when the stock is the limit, none when it is reached. */
  added: number;
}

/**
 * Puts `quantity` units of the product in the cart. The cart never holds more than the stock, so
 * what does not fit is left out. Whatever the product looks like now replaces the old copy.
 */
export function addToCart(
  items: CartItem[],
  product: CartProduct,
  quantity: number,
): AddToCartResult {
  const current = items.find((item) => item.id === product.id)?.quantity ?? 0;
  const target = Math.min(current + Math.max(quantity, 0), Math.max(product.stock, 0));
  const added = target - current;
  if (added <= 0) {
    return { items, added: 0 };
  }
  const item: CartItem = { ...product, quantity: target };
  const exists = current > 0;
  return {
    items: exists
      ? items.map((existing) => (existing.id === product.id ? item : existing))
      : [...items, item],
    added,
  };
}

export type SyncNotice =
  | { kind: "adjusted"; productId: string; title: string; quantity: number }
  | { kind: "removed"; productId: string; title: string };

export interface SyncResult {
  items: CartItem[];
  /** What the customer must be told, or `null` when the copy only got fresher. */
  notice: SyncNotice | null;
}

/**
 * Refreshes the copy of a product that is already in the cart with what its page shows now. A
 * stock below the quantity lowers it, and no stock at all takes the product out.
 */
export function syncProduct(items: CartItem[], product: CartProduct): SyncResult {
  const item = items.find((existing) => existing.id === product.id);
  if (!item) {
    return { items, notice: null };
  }
  if (product.stock <= 0) {
    return {
      items: items.filter((existing) => existing.id !== product.id),
      notice: { kind: "removed", productId: product.id, title: product.title },
    };
  }
  const quantity = Math.min(item.quantity, product.stock);
  return {
    items: items.map((existing) =>
      existing.id === product.id ? { ...product, quantity } : existing,
    ),
    notice:
      quantity < item.quantity
        ? { kind: "adjusted", productId: product.id, title: product.title, quantity }
        : null,
  };
}

/** Units in the cart, which is what the header counts. */
export function cartCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

/**
 * Sets how many units of a product the cart holds. The stock is the ceiling and zero takes the
 * product out; a product that is not in the cart is left alone.
 */
export function setQuantity(items: CartItem[], productId: string, quantity: number): CartItem[] {
  const item = items.find((existing) => existing.id === productId);
  if (!item || Number.isNaN(quantity)) {
    return items;
  }
  const target = Math.min(Math.max(Math.trunc(quantity), 0), Math.max(item.stock, 0));
  if (target === 0) {
    return items.filter((existing) => existing.id !== productId);
  }
  if (target === item.quantity) {
    return items;
  }
  return items.map((existing) =>
    existing.id === productId ? { ...existing, quantity: target } : existing,
  );
}

export function removeItem(items: CartItem[], productId: string): CartItem[] {
  return items.filter((existing) => existing.id !== productId);
}

function toCents(price: string): number {
  return Math.round(Number(price) * 100);
}

function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** What the units of one product cost, as decimal text such as `"19600.00"`. */
export function lineSubtotal(item: CartItem): string {
  return fromCents(toCents(item.price) * item.quantity);
}

/** What the whole cart costs, as decimal text. Added in cents so decimals never drift. */
export function cartTotal(items: CartItem[]): string {
  return fromCents(items.reduce((sum, item) => sum + toCents(item.price) * item.quantity, 0));
}
