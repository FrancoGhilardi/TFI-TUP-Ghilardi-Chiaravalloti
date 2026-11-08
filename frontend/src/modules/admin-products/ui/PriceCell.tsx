import { formatPrice } from "@/modules/core/formatters/price";

import type { AdminProductRow } from "../domain/admin-product";

interface PriceCellProps {
  product: AdminProductRow;
}

/** The price; while an offer is in force, the offer price with the regular one crossed out. */
export const PriceCell = ({ product }: PriceCellProps) => {
  if (product.isOnSale && product.salePrice) {
    return (
      <span className="flex flex-col md:items-end">
        <b>{formatPrice(product.salePrice)}</b>
        <s className="text-xs text-ink-soft">{formatPrice(product.price)}</s>
      </span>
    );
  }
  return <b>{formatPrice(product.price)}</b>;
};
