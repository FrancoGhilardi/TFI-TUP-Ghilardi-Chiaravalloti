import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  addToCart,
  type CartItem,
  type CartProduct,
  type SyncNotice,
  syncProduct,
} from "../domain/cart";
import { CART_STORAGE_KEY, restoreItems } from "../infrastructure/cart-storage";
import { safeLocalStorage } from "../infrastructure/safe-storage";

interface CartState {
  items: CartItem[];
  /** Set by the last sync and never stored: it only matters while the page that raised it is open. */
  syncNotice: SyncNotice | null;
  /** Returns how many units went in. */
  add: (product: CartProduct, quantity: number) => number;
  sync: (product: CartProduct) => void;
  clearSyncNotice: () => void;
}

/**
 * The cart, kept in the browser. Zustand renders its initial (empty) state on the server and on
 * the hydration pass, so what the visitor stored shows up right after, never as a mismatch.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      syncNotice: null,
      add: (product, quantity) => {
        const { items, added } = addToCart(get().items, product, quantity);
        if (added > 0) {
          set({ items });
        }
        return added;
      },
      sync: (product) => {
        const { items, notice } = syncProduct(get().items, product);
        set({ items, syncNotice: notice });
      },
      clearSyncNotice: () => set({ syncNotice: null }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: ({ items }) => ({ items }),
      merge: (persisted, current) => ({
        ...current,
        items: restoreItems((persisted as { items?: unknown } | null)?.items),
      }),
    },
  ),
);
