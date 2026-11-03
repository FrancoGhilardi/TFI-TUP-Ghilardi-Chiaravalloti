import { publicConfig } from "@/modules/core/config/env";
import { cartInquiryUrl } from "@/modules/whatsapp";

import { cartTotal, lineSubtotal } from "../domain/cart";
import { useCartStore } from "./cart-store";

/** The cart as the drawer shows it: its items, what they cost and the chat that orders them. */
export function useCart() {
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const clear = useCartStore((state) => state.clear);

  const total = cartTotal(items);
  const orderUrl = cartInquiryUrl(publicConfig.whatsappNumber, {
    lines: items.map((item) => ({
      quantity: item.quantity,
      title: item.title,
      subtotal: lineSubtotal(item),
    })),
    total,
  });

  return { items, total, orderUrl, setQuantity, remove, clear };
}
