import { Trash2 } from "lucide-react";
import Image from "next/image";

import { publicConfig } from "@/modules/core/config/env";
import { isOptimizableImage } from "@/modules/core/config/images";
import { formatPrice } from "@/modules/core/formatters/price";
import { Button } from "@/modules/core/ui/primitives/button";

import { cartContent } from "../content/cart";
import { type CartItem, lineSubtotal } from "../domain/cart";
import { QuantitySelector } from "./QuantitySelector";

interface CartLineProps {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

/** A product in the cart, with its image, price, quantity and a way to take it out. */
export const CartLine = ({ item, onQuantityChange, onRemove }: CartLineProps) => {
  const { remove, unitPrice } = cartContent.drawer;
  return (
    <li className="flex gap-3 border-b border-line-soft py-4 last:border-b-0">
      <span className="relative aspect-4/5 w-16 shrink-0 overflow-hidden rounded-md bg-wheat">
        <Image
          src={item.imageUrl}
          alt=""
          fill
          sizes="64px"
          unoptimized={!isOptimizableImage(item.imageUrl, publicConfig.storageOrigin)}
          className="object-cover"
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 font-semibold text-ink">{item.title}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={remove(item.title)}
            onClick={onRemove}
            className="-mt-1.5 -mr-2 size-9 shrink-0"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="text-sm text-ink-soft">{unitPrice(formatPrice(item.price))}</p>
        <div className="flex items-center justify-between gap-2">
          <QuantitySelector
            quantity={item.quantity}
            subject={item.title}
            canDecrease={item.quantity > 1}
            canIncrease={item.quantity < item.stock}
            onDecrease={() => onQuantityChange(item.quantity - 1)}
            onIncrease={() => onQuantityChange(item.quantity + 1)}
          />
          <p className="font-semibold text-ink tabular-nums">{formatPrice(lineSubtotal(item))}</p>
        </div>
      </div>
    </li>
  );
};
