import { catalogContent } from "../content/catalog";
import type { ActiveFilter } from "../domain/active-filters";
import type { CatalogQuery } from "../domain/catalog-query";
import { ActiveFilters } from "./ActiveFilters";

interface ResultSummaryProps {
  total: number;
  filters: ActiveFilter[];
  query: CatalogQuery;
}

/** How many products match, next to the filters that produced them. */
export const ResultSummary = ({ total, filters, query }: ResultSummaryProps) => {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="text-sm font-medium text-ink-soft">{catalogContent.total(total)}</p>
      <ActiveFilters filters={filters} query={query} />
    </div>
  );
};
