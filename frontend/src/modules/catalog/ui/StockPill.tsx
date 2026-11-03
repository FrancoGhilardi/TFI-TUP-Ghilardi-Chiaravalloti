import { Ban, Check, TriangleAlert } from "lucide-react";

import { cn } from "@/modules/core/lib/utils";

import { productDetailContent } from "../content/product-detail";
import { stockStatus } from "../domain/product-stock";

interface StockPillProps {
  stock: number;
}

// Text tones are the deep ones: the soft backgrounds do not reach AA with the brand tones.
const TONES = {
  in: { styles: "bg-teal-soft text-teal-deep", Icon: Check, iconStyles: "text-teal-deep" },
  low: { styles: "bg-coral-soft text-ink", Icon: TriangleAlert, iconStyles: "text-coral-strong" },
  out: { styles: "bg-wheat text-ink", Icon: Ban, iconStyles: "text-ink-soft" },
} as const;

/** How many units are left, in words the customer reads at a glance. */
export const StockPill = ({ stock }: StockPillProps) => {
  const status = stockStatus(stock);
  const { styles, Icon, iconStyles } = TONES[status.kind];
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.9rem] font-semibold",
        styles,
      )}
    >
      <Icon className={cn("size-4", iconStyles)} aria-hidden="true" />
      {productDetailContent.stock(status)}
    </p>
  );
};
