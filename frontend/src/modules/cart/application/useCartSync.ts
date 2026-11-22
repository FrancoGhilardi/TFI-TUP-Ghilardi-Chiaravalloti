import { useEffect, useRef } from "react";

import type { CartProduct, SyncNotice } from "../domain/cart";
import { useCartStore } from "./cart-store";

/**
 * Refreshes the cart's copy of the product when its page opens, as the cart never revalidates by
 * itself. Depends on the values, not on the object, so a parent that rebuilds it does not repeat it.
 */
export function useCartSync({ id, slug, title, price, stock, imageUrl }: CartProduct): void {
  const sync = useCartStore((state) => state.sync);
  const showSyncNotice = useCartStore((state) => state.showSyncNotice);
  const clearSyncNotice = useCartStore((state) => state.clearSyncNotice);
  // A second run of the effect (strict mode, or the same product refreshed) finds the copy already
  // fixed and has nothing new to say: the notice this visit raised has to survive it.
  const raised = useRef<SyncNotice | null>(null);
  useEffect(() => {
    const earlier = raised.current?.productId === id ? raised.current : null;
    const notice = sync({ id, slug, title, price, stock, imageUrl }) ?? earlier;
    raised.current = notice;
    showSyncNotice(notice);
    // The notice is about this visit to the page, so it goes with it.
    return clearSyncNotice;
  }, [sync, showSyncNotice, clearSyncNotice, id, slug, title, price, stock, imageUrl]);
}
