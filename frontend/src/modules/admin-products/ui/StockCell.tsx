import { cn } from "@/modules/core/lib/utils";

import { LOW_STOCK_MAX } from "../domain/admin-product";

interface StockCellProps {
  stock: number;
}

/** The stock; out of stock and running out stand out. */
export const StockCell = ({ stock }: StockCellProps) => {
  return (
    <span
      className={cn(
        stock <= LOW_STOCK_MAX && "font-semibold text-coral-strong",
        stock === 0 && "font-bold",
      )}
    >
      {stock}
    </span>
  );
};
