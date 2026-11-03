"use client";

import { Button } from "@/modules/core/ui/primitives/button";

import { useAddToCart } from "../application/useAddToCart";
import { cartContent } from "../content/cart";
import type { CartProduct } from "../domain/cart";

interface QuickAddToCartProps {
  product: CartProduct;
}

/** Puts one unit of a listed product in the cart, without opening its page. */
export const QuickAddToCart = ({ product }: QuickAddToCartProps) => {
  const { canAdd, add, outcome } = useAddToCart(product);

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" variant="accent" size="sm" disabled={!canAdd} onClick={add}>
        {canAdd ? cartContent.quickAdd : cartContent.outOfStock}
      </Button>
      {/* Stays mounted, as a live region must; a new node for each try announces a repeat too. */}
      <p role="status" className="text-xs font-semibold text-teal empty:hidden">
        {outcome && (
          <span key={outcome.attempt}>
            {outcome.added === 0 ? cartContent.allInCart : cartContent.added(1, 1)}
          </span>
        )}
      </p>
    </div>
  );
};
