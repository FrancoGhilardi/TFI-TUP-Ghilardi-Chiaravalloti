"use client";

import { ShoppingCart } from "lucide-react";

import { Button } from "@/modules/core/ui/primitives/button";

import { cartBadgeText, cartButtonLabel } from "../domain/cart-indicator";

interface CartButtonProps {
  count: number;
  onClick?: () => void;
}

export const CartButton = ({ count, onClick }: CartButtonProps) => {
  const badge = cartBadgeText(count);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={cartButtonLabel(count)}
      onClick={onClick}
      className="relative text-ink"
    >
      <ShoppingCart className="size-5" aria-hidden="true" />
      {badge && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-cream bg-coral-strong px-1 text-[0.7rem] font-bold text-white"
        >
          {badge}
        </span>
      )}
    </Button>
  );
};
