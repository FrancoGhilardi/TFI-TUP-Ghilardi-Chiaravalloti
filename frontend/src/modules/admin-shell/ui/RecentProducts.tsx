import { useLatestProducts } from "@/modules/admin-products";
import { ADMIN_PATHS } from "@/modules/auth";
import { formatRelativeTime } from "@/modules/core/formatters/relative-time";

import { homeContent } from "../content/home";
import { RECENT_ROWS } from "../domain/home-lists";
import { BlockError } from "./BlockError";
import { ListSkeleton } from "./ListSkeleton";
import { Panel } from "./Panel";
import { ProductRow } from "./ProductRow";

export const RecentProducts = () => {
  const { data, dataUpdatedAt, isPending, isError, refetch } = useLatestProducts(RECENT_ROWS);
  const { title, action, empty, active, inactive } = homeContent.recent;

  return (
    <Panel title={title} action={{ label: action, href: ADMIN_PATHS.products }}>
      {isPending && <ListSkeleton rows={RECENT_ROWS} />}
      {isError && !data && <BlockError onRetry={() => void refetch()} />}
      {data?.length === 0 && <p className="text-ink-soft">{empty}</p>}
      {data && data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              detail={`${product.sku} · ${formatRelativeTime(product.updatedAt, new Date(dataUpdatedAt))}`}
              trailing={
                <span className="rounded-full bg-wheat px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                  {product.isActive ? active : inactive}
                </span>
              }
            />
          ))}
        </ul>
      )}
    </Panel>
  );
};
