import { cartCount } from "../domain/cart";
import { useCartStore } from "./cart-store";

/** Units in the cart: `0` on the server and until the browser has read the stored cart. */
export function useCartCount(): number {
  return useCartStore((state) => cartCount(state.items));
}
