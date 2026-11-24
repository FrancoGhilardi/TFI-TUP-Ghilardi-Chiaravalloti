import Link from "next/link";

import { formatDateTime } from "@/modules/core/formatters/date-time";
import { formatRelativeTime } from "@/modules/core/formatters/relative-time";
import { ListRow } from "@/modules/core/ui/ListRow";
import { RowActionsCell } from "@/modules/core/ui/RowActionsCell";
import { RowCell } from "@/modules/core/ui/RowCell";
import { RowLeadCell } from "@/modules/core/ui/RowLeadCell";

import { productsContent } from "../content/products";
import type { AdminProductRow } from "../domain/admin-product";
import { productState } from "../domain/product-state";
import { PRODUCTS_PATH } from "../domain/products-query";
import { MarkBadges } from "./MarkBadges";
import { PriceCell } from "./PriceCell";
import { ProductThumb } from "./ProductThumb";
import { ProductRowActions } from "./ProductRowActions";
import { StateBadge } from "./StateBadge";
import { StockCell } from "./StockCell";

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
    <ListRow deleted={state === "deleted"}>
      <RowLeadCell>
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
      </RowLeadCell>
      <RowCell label={columns.sku}>
        <span className="font-mono text-xs">{product.sku}</span>
      </RowCell>
      <RowCell label={columns.category}>
        {product.primaryCategory?.name ?? <span className="text-ink-soft">{noCategory}</span>}
      </RowCell>
      <RowCell label={columns.price} numeric>
        <PriceCell product={product} />
      </RowCell>
      <RowCell label={columns.stock} numeric>
        <StockCell stock={product.stock} />
      </RowCell>
      <RowCell label={columns.marks}>
        <MarkBadges product={product} />
      </RowCell>
      <RowCell label={columns.state}>
        <StateBadge state={state} />
      </RowCell>
      <RowCell label={columns.modified}>
        <time
          dateTime={product.updatedAt.toISOString()}
          title={formatDateTime(product.updatedAt)}
          className="text-xs"
        >
          {formatRelativeTime(product.updatedAt, readAt)}
        </time>
      </RowCell>
      <RowActionsCell>
        <ProductRowActions
          product={product}
          pending={pending}
          onRemove={onRemove}
          onRestore={onRestore}
        />
      </RowActionsCell>
    </ListRow>
  );
};
