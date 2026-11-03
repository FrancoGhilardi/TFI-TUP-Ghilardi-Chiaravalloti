"use client";

import { ShoppingCart } from "lucide-react";

import { Button } from "@/modules/core/ui/primitives/button";

import { useAddToCart } from "../application/useAddToCart";
import { cartContent } from "../content/cart";
import type { CartProduct } from "../domain/cart";
import { QuantitySelector } from "./QuantitySelector";

interface AddToCartProps {
  product: CartProduct;
}

/** Quantity and the button that puts it in the cart, with what happened said out loud. */
export const AddToCart = ({ product }: AddToCartProps) => {
  const control = useAddToCart(product);
  const { outcome } = control;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <QuantitySelector
          quantity={control.quantity}
          canDecrease={control.canDecrease}
          canIncrease={control.canIncrease}
          onDecrease={control.decrease}
          onIncrease={control.increase}
        />
        <Button
          type="button"
          variant="accent"
          disabled={!control.canAdd}
          onClick={control.add}
          className="h-11 px-6"
        >
          <ShoppingCart aria-hidden="true" />
          {control.canAdd ? cartContent.add : cartContent.outOfStock}
        </Button>
      </div>
      {/* Stays mounted, as a live region must; a new node for each try announces a repeat too. */}
      <p role="status" className="text-sm font-semibold text-teal empty:hidden">
        {outcome && (
          <span key={outcome.attempt}>
            {outcome.added === 0
              ? cartContent.allInCart
              : cartContent.added(outcome.added, outcome.requested)}
          </span>
        )}
      </p>
    </div>
  );
};
