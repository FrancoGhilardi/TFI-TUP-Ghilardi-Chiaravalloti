import { ListEmptyState } from "@/modules/core/ui/ListEmptyState";
import { ListResults } from "@/modules/core/ui/ListResults";
import { PackageSearch } from "lucide-react";

import { useAdminProducts } from "../application/useAdminProducts";
import { useProductActions } from "../application/useProductActions";
import { productsContent } from "../content/products";
import {
  clearedFilters,
  isFiltered,
  PRODUCTS_PAGE_SIZE,
  PRODUCTS_PATH,
  type ProductsQuery,
  productsHref,
} from "../domain/products-query";
import { ProductsTable } from "./ProductsTable";

interface ProductsResultsProps {
  query: ProductsQuery;
  go: (changes: Partial<ProductsQuery>) => void;
}

/** What the query finds, or why it shows nothing: still loading, failed, past the end, or empty. */
export const ProductsResults = ({ query, go }: ProductsResultsProps) => {
  const list = useAdminProducts(query);
  const { remove, restore, isPending } = useProductActions();
  const { empty, clear, newProduct, table } = productsContent;

  return (
    <ListResults
      list={list}
      page={query.page}
      pageSize={PRODUCTS_PAGE_SIZE}
      firstPageHref={productsHref(query, { page: 1 })}
      hrefFor={(page) => productsHref(query, { page })}
      text={{ ...productsContent, summary: table.summary }}
      empty={
        <ListEmptyState
          icon={PackageSearch}
          filtered={isFiltered(query)}
          onClear={() => go(clearedFilters(query))}
          text={{ ...empty, clear }}
          create={{ label: newProduct, href: `${PRODUCTS_PATH}/nuevo` }}
        />
      }
    >
      {(items, readAt) => (
        <ProductsTable
          products={items}
          query={query}
          go={go}
          readAt={readAt}
          isPending={isPending}
          onRemove={(id) => void remove(id)}
          onRestore={(id) => void restore(id)}
        />
      )}
    </ListResults>
  );
};
