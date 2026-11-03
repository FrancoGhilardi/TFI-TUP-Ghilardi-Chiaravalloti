import { cn } from "@/modules/core/lib/utils";
import { formatPrice } from "@/modules/core/formatters/price";

import { productDetailContent } from "../content/product-detail";
import { currentPrice, hasRunningSale, type ProductPricing } from "../domain/product-card";

const SIZES = {
  card: { wrapper: "gap-2", current: "text-lg", previous: "text-sm" },
  detail: { wrapper: "gap-3", current: "text-3xl", previous: "text-lg" },
} as const;

interface ProductPriceProps extends ProductPricing {
  size?: keyof typeof SIZES;
}

/** The price the customer pays and, during a running sale, the regular one struck through. */
export const ProductPrice = ({ size = "card", ...pricing }: ProductPriceProps) => {
  const styles = SIZES[size];
  return (
    <p className={cn("flex items-baseline tabular-nums", styles.wrapper)}>
      <span className={cn("font-bold text-ink", styles.current)}>
        {formatPrice(currentPrice(pricing))}
      </span>
      {hasRunningSale(pricing) && (
        <del className={cn("font-medium text-ink-soft", styles.previous)}>
          <span className="sr-only">{productDetailContent.price.previous}</span>
          {formatPrice(pricing.price)}
        </del>
      )}
    </p>
  );
};
