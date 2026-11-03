"use client";

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
  const { title, empty, browse, total: totalLabel, order } = cartContent.drawer;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" aria-describedby={undefined} className="gap-0 bg-cream">
        <SheetHeader className="border-b border-line-soft pr-14">
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
        </SheetHeader>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-ink-soft">{empty}</p>
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
              <ClearCartButton onConfirm={clear} />
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
