import type { ReactNode } from "react";

import type { AdminProductSummary } from "@/modules/admin-products";

import { ProductThumb } from "./ProductThumb";

interface ProductRowProps {
  product: AdminProductSummary;
  /** Second line, under the title. */
  detail: string;
  /** What goes at the end of the row, such as its state or its stock. */
  trailing: ReactNode;
}

export const ProductRow = ({ product, detail, trailing }: ProductRowProps) => {
  return (
    <li className="flex items-center gap-3">
      <ProductThumb url={product.thumbnailUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{product.title}</p>
        <p className="truncate text-sm text-ink-soft">{detail}</p>
      </div>
      {trailing}
    </li>
  );
};
