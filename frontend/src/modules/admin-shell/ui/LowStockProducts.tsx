import { useLowStockProducts } from "@/modules/admin-products";
import { ADMIN_PATHS } from "@/modules/auth";

import { homeContent } from "../content/home";
import { LOW_STOCK_ROWS } from "../domain/home-lists";
import { BlockError } from "./BlockError";
import { ListSkeleton } from "./ListSkeleton";
import { Panel } from "./Panel";
import { ProductRow } from "./ProductRow";

export const LowStockProducts = () => {
  const { data, isPending, isError, refetch } = useLowStockProducts(LOW_STOCK_ROWS);
  const { title, action, empty, outOfStock, units } = homeContent.lowStock;

  return (
    <Panel title={title} action={{ label: action, href: ADMIN_PATHS.products }}>
      {isPending && <ListSkeleton rows={LOW_STOCK_ROWS} />}
      {isError && !data && <BlockError onRetry={() => void refetch()} />}
      {data?.items.length === 0 && <p className="text-ink-soft">{empty}</p>}
      {data && data.items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.items.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              detail={product.sku}
              trailing={
                <span className="text-sm font-semibold text-coral-strong tabular-nums">
                  {product.stock === 0 ? outOfStock : units(product.stock)}
                </span>
              }
            />
          ))}
        </ul>
      )}
    </Panel>
  );
};
