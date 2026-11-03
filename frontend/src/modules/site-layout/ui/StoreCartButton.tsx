"use client";

import { useState } from "react";

import { CartDrawer, useCartCount } from "@/modules/cart";

import { CartButton } from "./CartButton";

/** The header's cart button, counting what the visitor has in the cart, and the drawer it opens. */
export const StoreCartButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <CartButton count={useCartCount()} onClick={() => setOpen(true)} />
      <CartDrawer open={open} onOpenChange={setOpen} />
    </>
  );
};
