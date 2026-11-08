import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/modules/core/lib/utils";

import { productsContent } from "../content/products";
import { nextSort, type ProductSort, type ProductsQuery } from "../domain/products-query";

interface SortHeaderProps {
  column: ProductSort;
  label: string;
  query: ProductsQuery;
  go: (changes: Partial<ProductsQuery>) => void;
  numeric?: boolean;
}

/** A column title that sorts the table; the active column says which way it goes. */
export const SortHeader = ({ column, label, query, go, numeric }: SortHeaderProps) => {
  const active = query.sort === column;
  const Icon = !active ? ArrowUpDown : query.direction === "asc" ? ArrowUp : ArrowDown;
  let ariaSort: "ascending" | "descending" | "none" = "none";
  if (active) {
    ariaSort = query.direction === "asc" ? "ascending" : "descending";
  }

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn("px-3 py-3 font-semibold", numeric ? "text-right" : "text-left")}
    >
      <button
        type="button"
        onClick={() => go(nextSort(query, column))}
        aria-label={productsContent.table.sortBy(label)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40",
          active ? "text-ink" : "text-ink-soft",
        )}
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </button>
    </th>
  );
};
