import { clearedFilters, isFiltered, type ProductsQuery } from "../domain/products-query";
import { useAdminProducts } from "../application/useAdminProducts";
import { useProductActions } from "../application/useProductActions";
import { PageOutOfRange } from "./PageOutOfRange";
import { ProductsEmptyState } from "./ProductsEmptyState";
import { ProductsErrorState } from "./ProductsErrorState";
import { ProductsFooter } from "./ProductsFooter";
import { ProductsSkeleton } from "./ProductsSkeleton";
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
    return <ProductsSkeleton />;
  }
  // A refresh that fails keeps showing the last page; only having nothing to show is an error.
  if (!list.data) {
    return <ProductsErrorState onRetry={() => void list.refetch()} />;
  }

  const { items, total } = list.data;
  if (items.length === 0) {
    return query.page > 1 ? (
      <PageOutOfRange query={query} />
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
      <ProductsFooter
        query={query}
        shown={items.length}
        total={total}
        stale={list.isPlaceholderData}
      />
    </div>
  );
};
