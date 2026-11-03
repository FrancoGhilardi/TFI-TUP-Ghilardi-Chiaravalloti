"use client";

import { useCartStore } from "../application/cart-store";
import { useCartSync } from "../application/useCartSync";
import { cartContent } from "../content/cart";
import type { CartProduct } from "../domain/cart";

interface CartSyncNoticeProps {
  product: CartProduct;
}

/**
 * Brings the cart's copy of the product up to date as its page opens and, if the stock forced a
 * change, tells the customer. Renders nothing otherwise.
 */
export const CartSyncNotice = ({ product }: CartSyncNoticeProps) => {
  useCartSync(product);
  const notice = useCartStore((state) => state.syncNotice);
  const ours = notice?.productId === product.id ? notice : null;

  return (
    <p
      role="status"
      className="rounded-xl bg-coral-soft px-4 py-3 text-sm font-semibold text-ink empty:hidden"
    >
      {ours && cartContent.sync(ours)}
    </p>
  );
};
