import { Pagination } from "@/modules/core/ui/Pagination";

import type { CatalogView } from "../application/catalog-view";
import { activeFilters } from "../domain/active-filters";
import { catalogHref, type CatalogQuery } from "../domain/catalog-query";
import type { CategoryNode } from "../domain/category";
import { CatalogEmptyState } from "./CatalogEmptyState";
import { CatalogErrorState } from "./CatalogErrorState";
import { PageOutOfRange } from "./PageOutOfRange";
import { ProductGrid } from "./ProductGrid";
import { ResultSummary } from "./ResultSummary";

interface CatalogResultsProps {
  view: CatalogView;
  query: CatalogQuery;
  tree: CategoryNode[];
}

/** The products for the query, or the state that replaces them. */
export const CatalogResults = ({ view, query, tree }: CatalogResultsProps) => {
  switch (view.kind) {
    case "error":
      return <CatalogErrorState retryHref={catalogHref(query, { page: query.page })} />;
    case "empty":
      return <CatalogEmptyState search={query.q} />;
    case "outOfRange":
      return <PageOutOfRange firstPageHref={catalogHref(query, { page: 1 })} />;
    case "results":
      return (
        <section aria-label="Resultados" className="flex flex-col gap-6">
          <ResultSummary
            total={view.page.totalItems}
            filters={activeFilters(query, tree)}
            query={query}
          />
          <ProductGrid products={view.page.items} layout="catalog" />
          <Pagination
            current={view.page.page}
            total={view.page.totalPages}
            hrefFor={(page) => catalogHref(query, { page })}
          />
        </section>
      );
  }
};
