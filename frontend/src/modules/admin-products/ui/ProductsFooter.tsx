import { cn } from "@/modules/core/lib/utils";
import { Pagination } from "@/modules/core/ui/Pagination";

import { productsContent } from "../content/products";
import { PRODUCTS_PAGE_SIZE, type ProductsQuery, productsHref } from "../domain/products-query";

interface ProductsFooterProps {
  query: ProductsQuery;
  /** Products on this page. */
  shown: number;
  /** Products in all, whatever the page. */
  total: number;
  /** What shows is the last read, not the one for this query: the range would not match. */
  stale?: boolean;
}

export const ProductsFooter = ({ query, shown, total, stale }: ProductsFooterProps) => {
  const from = (query.page - 1) * PRODUCTS_PAGE_SIZE + 1;
  const to = from + shown - 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-3">
      <p className={cn("text-sm text-ink-soft tabular-nums", stale && "invisible")}>
        {productsContent.table.summary(from, to, total)}
      </p>
      <Pagination
        current={query.page}
        total={Math.ceil(total / PRODUCTS_PAGE_SIZE)}
        hrefFor={(page) => productsHref(query, { page })}
      />
    </div>
  );
};
