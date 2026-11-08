import Link from "next/link";

import { formatDateTime } from "@/modules/core/formatters/date-time";
import { formatRelativeTime } from "@/modules/core/formatters/relative-time";
import { cn } from "@/modules/core/lib/utils";

import { productsContent } from "../content/products";
import type { AdminProductRow } from "../domain/admin-product";
import { productState } from "../domain/product-state";
import { PRODUCTS_PATH } from "../domain/products-query";
import { MarkBadges } from "./MarkBadges";
import { PriceCell } from "./PriceCell";
import { ProductThumb } from "./ProductThumb";
import { RowActions } from "./RowActions";
import { StateBadge } from "./StateBadge";
import { StockCell } from "./StockCell";

const CELL =
  "px-3 py-3 align-middle max-md:flex max-md:items-center max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-1.5 max-md:before:text-xs max-md:before:font-semibold max-md:before:text-ink-soft max-md:before:content-[attr(data-label)]";

interface ProductsTableRowProps {
  product: AdminProductRow;
  /** The moment the list was read, to say how long ago each product changed. */
  readAt: Date;
  pending: boolean;
  onRemove: () => void;
  onRestore: () => void;
}

export const ProductsTableRow = ({
  product,
  readAt,
  pending,
  onRemove,
  onRestore,
}: ProductsTableRowProps) => {
  const { columns, noCategory } = productsContent.table;
  const state = productState(product);

  return (
    <tr
      className={cn(
        "border-t border-line-soft max-md:block max-md:rounded-card max-md:border max-md:p-4",
        state === "deleted" && "bg-wheat/40 text-ink-soft",
      )}
    >
      <td className="px-3 py-3 align-middle max-md:block max-md:px-0 max-md:pt-0">
        <div className="flex items-center gap-3">
          <ProductThumb url={product.thumbnailUrl} />
          <div className="min-w-0">
            <Link
              href={`${PRODUCTS_PATH}/${product.id}`}
              className="block truncate font-semibold text-ink outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              {product.title}
            </Link>
            <span className="block truncate text-xs text-ink-soft">/{product.slug}</span>
          </div>
        </div>
      </td>
      <td data-label={columns.sku} className={CELL}>
        <span className="font-mono text-xs">{product.sku}</span>
      </td>
      <td data-label={columns.category} className={CELL}>
        {product.primaryCategory?.name ?? <span className="text-ink-soft">{noCategory}</span>}
      </td>
      <td data-label={columns.price} className={cn(CELL, "md:text-right md:tabular-nums")}>
        <PriceCell product={product} />
      </td>
      <td data-label={columns.stock} className={cn(CELL, "md:text-right md:tabular-nums")}>
        <StockCell stock={product.stock} />
      </td>
      <td data-label={columns.marks} className={CELL}>
        <MarkBadges product={product} />
      </td>
      <td data-label={columns.state} className={CELL}>
        <StateBadge state={state} />
      </td>
      <td data-label={columns.modified} className={CELL}>
        <time
          dateTime={product.updatedAt.toISOString()}
          title={formatDateTime(product.updatedAt)}
          className="text-xs"
        >
          {formatRelativeTime(product.updatedAt, readAt)}
        </time>
      </td>
      <td className="px-3 py-3 align-middle max-md:block max-md:px-0 max-md:pb-0">
        <RowActions product={product} pending={pending} onRemove={onRemove} onRestore={onRestore} />
      </td>
    </tr>
  );
};
