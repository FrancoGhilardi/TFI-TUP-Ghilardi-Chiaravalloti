import Link from "next/link";

import { catalogContent } from "../content/catalog";
import type { ActiveFilter } from "../domain/active-filters";
import { catalogHref, type CatalogQuery, WITHOUT_FILTERS } from "../domain/catalog-query";
import { FilterChip } from "./FilterChip";

interface ActiveFiltersProps {
  filters: ActiveFilter[];
  query: CatalogQuery;
}

const { filters: copy } = catalogContent;

function labelOf({ kind, value = "" }: ActiveFilter): string {
  switch (kind) {
    case "search":
      return copy.search(value);
    case "category":
      return value;
    case "featured":
      return copy.featured;
    case "newArrivals":
      return copy.newArrivals;
  }
}

export const ActiveFilters = ({ filters, query }: ActiveFiltersProps) => {
  if (filters.length === 0) {
    return null;
  }
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <li key={filter.kind}>
          <FilterChip label={labelOf(filter)} removeHref={catalogHref(query, filter.without)} />
        </li>
      ))}
      <li>
        <Link
          href={catalogHref(query, WITHOUT_FILTERS)}
          className="text-sm font-semibold text-teal hover:underline"
        >
          {copy.clear}
        </Link>
      </li>
    </ul>
  );
};
