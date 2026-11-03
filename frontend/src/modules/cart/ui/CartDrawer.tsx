"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";

import { formatPrice } from "@/modules/core/formatters/price";
import { ExternalLink } from "@/modules/core/ui/ExternalLink";
import { WhatsAppIcon } from "@/modules/core/ui/icons/WhatsAppIcon";
import { Button } from "@/modules/core/ui/primitives/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/modules/core/ui/primitives/sheet";

import { useCart } from "../application/useCart";
import { cartContent } from "../content/cart";
import { CartLine } from "./CartLine";
import { ClearCartButton } from "./ClearCartButton";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The cart in a panel at the side: change quantities, remove, empty it or order it by chat. */
export const CartDrawer = ({ open, onOpenChange }: CartDrawerProps) => {
  const { items, total, orderUrl, setQuantity, remove, clear } = useCart();
  const { title, empty, browse, total: totalLabel, order, orderNote } = cartContent.drawer;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" aria-describedby={undefined} className="gap-0 bg-cream">
        <SheetHeader className="border-b border-line-soft pr-14">
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
        </SheetHeader>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <div>
              <p className="font-semibold text-ink">{empty.title}</p>
              <p className="mt-1.5 text-ink-soft">{empty.text}</p>
            </div>
            <Button asChild variant="outline" className="h-11 px-6">
              <SheetClose asChild>
                <Link href="/productos">{browse}</Link>
              </SheetClose>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-4">
              {items.map((item) => (
                <CartLine
                  key={item.id}
                  item={item}
                  onQuantityChange={(quantity) => setQuantity(item.id, quantity)}
                  onRemove={() => remove(item.id)}
                />
              ))}
            </ul>
            <SheetFooter className="gap-3 border-t border-line-soft">
              <p className="flex items-baseline justify-between text-lg font-semibold text-ink">
                <span>{totalLabel}</span>
                <span className="tabular-nums">{formatPrice(total)}</span>
              </p>
              <Button asChild variant="whatsapp" className="h-11 px-6">
                <ExternalLink href={orderUrl}>
                  <WhatsAppIcon />
                  {order}
                </ExternalLink>
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-sm text-ink-soft">
                <Sparkles className="size-4 shrink-0 text-gold" aria-hidden="true" />
                {orderNote}
              </p>
              <ClearCartButton onConfirm={clear} />
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
