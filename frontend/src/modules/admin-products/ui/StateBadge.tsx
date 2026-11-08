import { cn } from "@/modules/core/lib/utils";

import { productsContent } from "../content/products";
import type { ProductState } from "../domain/product-state";

const STYLES: Record<ProductState, string> = {
  active: "bg-teal-soft text-teal-deep",
  inactive: "bg-wheat text-ink-soft",
  deleted: "bg-coral-soft text-coral-strong",
};

interface StateBadgeProps {
  state: ProductState;
}

export const StateBadge = ({ state }: StateBadgeProps) => {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STYLES[state])}>
      {productsContent.table.states[state]}
    </span>
  );
};
