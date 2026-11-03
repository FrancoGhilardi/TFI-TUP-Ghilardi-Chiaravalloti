import { useEffect } from "react";

import type { CartProduct } from "../domain/cart";
import { useCartStore } from "./cart-store";

/**
 * Refreshes the cart's copy of the product when its page opens, as the cart never revalidates by
 * itself. Depends on the values, not on the object, so a parent that rebuilds it does not repeat it.
 */
export function useCartSync({ id, slug, title, price, stock, imageUrl }: CartProduct): void {
  const sync = useCartStore((state) => state.sync);
  const clearSyncNotice = useCartStore((state) => state.clearSyncNotice);
  useEffect(() => {
    sync({ id, slug, title, price, stock, imageUrl });
    // The notice is about this visit to the page, so it goes with it.
    return clearSyncNotice;
  }, [sync, clearSyncNotice, id, slug, title, price, stock, imageUrl]);
}
