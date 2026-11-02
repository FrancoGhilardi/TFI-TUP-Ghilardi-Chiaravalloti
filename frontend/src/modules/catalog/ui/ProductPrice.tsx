import { formatPrice } from "@/modules/core/formatters/price";

import { currentPrice, hasRunningSale, type ProductPricing } from "../domain/product-card";

type ProductPriceProps = ProductPricing;

export const ProductPrice = (pricing: ProductPriceProps) => {
  return (
    <p className="flex items-baseline gap-2 tabular-nums">
      <span className="text-lg font-bold text-ink">{formatPrice(currentPrice(pricing))}</span>
      {hasRunningSale(pricing) && (
        <del className="text-sm font-medium text-ink-soft">
          <span className="sr-only">Precio anterior: </span>
          {formatPrice(pricing.price)}
        </del>
      )}
    </p>
  );
};
