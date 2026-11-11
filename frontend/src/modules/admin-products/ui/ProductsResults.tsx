import { ListFooter } from "@/modules/core/ui/ListFooter";
import { LoadErrorState } from "@/modules/core/ui/LoadErrorState";
import { OutOfRangeState } from "@/modules/core/ui/OutOfRangeState";
import { TableSkeleton } from "@/modules/core/ui/TableSkeleton";

import { productsContent } from "../content/products";
import {
  clearedFilters,
  isFiltered,
  PRODUCTS_PAGE_SIZE,
  type ProductsQuery,
  productsHref,
} from "../domain/products-query";
import { useAdminProducts } from "../application/useAdminProducts";
import { useProductActions } from "../application/useProductActions";
import { ProductsEmptyState } from "./ProductsEmptyState";
import { ProductsTable } from "./ProductsTable";

interface ProductsResultsProps {
  query: ProductsQuery;
  go: (changes: Partial<ProductsQuery>) => void;
}

/** What the query finds, or why it shows nothing: still loading, failed, past the end, or empty. */
export const ProductsResults = ({ query, go }: ProductsResultsProps) => {
  const list = useAdminProducts(query);
  const { remove, restore, isPending } = useProductActions();

  if (list.isPending) {
    return <TableSkeleton label={productsContent.loading} />;
  }
  // A refresh that fails keeps showing the last page; only having nothing to show is an error.
  if (!list.data) {
    return <LoadErrorState {...productsContent.error} onRetry={() => void list.refetch()} framed />;
  }

  const { items, total } = list.data;
  if (items.length === 0) {
    return query.page > 1 ? (
      <OutOfRangeState
        {...productsContent.outOfRange}
        firstPageHref={productsHref(query, { page: 1 })}
      />
    ) : (
      <ProductsEmptyState filtered={isFiltered(query)} onClear={() => go(clearedFilters(query))} />
    );
  }

  return (
    // While the next page loads, the last one stays as a reference but cannot be acted on: it is not
    // what the filters, the sort and the page on screen now describe.
    <div
      aria-busy={list.isFetching}
      inert={list.isPlaceholderData}
      className={list.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}
    >
      <div className="overflow-x-auto md:overflow-visible">
        <ProductsTable
          products={items}
          query={query}
          go={go}
          readAt={new Date(list.dataUpdatedAt)}
          isPending={isPending}
          onRemove={(id) => void remove(id)}
          onRestore={(id) => void restore(id)}
        />
      </div>
      <ListFooter
        page={query.page}
        pageSize={PRODUCTS_PAGE_SIZE}
        shown={items.length}
        total={total}
        summary={productsContent.table.summary}
        hrefFor={(page) => productsHref(query, { page })}
        stale={list.isPlaceholderData}
      />
    </div>
  );
};
