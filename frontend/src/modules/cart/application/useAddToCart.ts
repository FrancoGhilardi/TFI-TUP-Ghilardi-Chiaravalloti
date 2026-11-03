import { useState } from "react";

import type { CartProduct } from "../domain/cart";
import { useCartStore } from "./cart-store";

export interface AddOutcome {
  /** Grows with every try, so the same outcome twice still reads as new. */
  attempt: number;
  added: number;
  requested: number;
}

export interface AddToCartControl {
  quantity: number;
  canAdd: boolean;
  canIncrease: boolean;
  canDecrease: boolean;
  increase: () => void;
  decrease: () => void;
  add: () => void;
  outcome: AddOutcome | null;
}

/** The quantity picked for a product and the act of putting it in the cart. */
export function useAddToCart(product: CartProduct): AddToCartControl {
  const addToCart = useCartStore((state) => state.add);
  const [selected, setSelected] = useState(1);
  const [outcome, setOutcome] = useState<AddOutcome | null>(null);

  // The page can be served again with less stock than what was picked.
  const quantity = Math.min(Math.max(selected, 1), Math.max(product.stock, 1));

  return {
    quantity,
    canAdd: product.stock > 0,
    canIncrease: quantity < product.stock,
    canDecrease: quantity > 1,
    increase: () => setSelected(quantity + 1),
    decrease: () => setSelected(quantity - 1),
    add: () => {
      const added = addToCart(product, quantity);
      setOutcome((previous) => ({
        attempt: (previous?.attempt ?? 0) + 1,
        added,
        requested: quantity,
      }));
    },
    outcome,
  };
}
