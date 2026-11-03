"use client";

import { useCartCount } from "@/modules/cart";

import { CartButton } from "./CartButton";

/** The header's cart button, counting what the visitor has in the cart. */
export const StoreCartButton = () => {
  return <CartButton count={useCartCount()} />;
};
