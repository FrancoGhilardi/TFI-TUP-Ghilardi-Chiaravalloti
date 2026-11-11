import { useCategoryOptions } from "@/modules/admin-categories";
import { Button } from "@/modules/core/ui/primitives/button";

import { productsContent } from "../content/products";
import {
  clearedFilters,
  isFiltered,
  PRODUCT_STATES,
  type ProductsQuery,
  SEARCH_MAX_LENGTH,
} from "../domain/products-query";
import { FilterSelect, type FilterOption } from "@/modules/core/ui/FilterSelect";
import { SearchField } from "@/modules/core/ui/SearchField";
import { MarkChip } from "./MarkChip";
import { StockFilter } from "./StockFilter";

interface ProductsToolbarProps {
  query: ProductsQuery;
  go: (changes: Partial<ProductsQuery>, options?: { replace?: boolean }) => void;
}

export const ProductsToolbar = ({ query, go }: ProductsToolbarProps) => {
  const { data: categories = [] } = useCategoryOptions();
  const { search, state, category, marks, clear } = productsContent;

  const categoryOptions: FilterOption[] = [
    { value: "", label: category.all },
    ...categories.map(({ id, label }) => ({ value: id, label })),
  ];
  // A category in the address that is not on the list (it failed to load, or it was deleted) must
  // not make the select show "all" while the list is filtered.
  if (query.category && !categoryOptions.some(({ value }) => value === query.category)) {
    categoryOptions.push({ value: query.category, label: category.selected });
  }

  return (
    <div className="flex flex-col gap-3 border-b border-line-soft p-4">
      <div className="flex flex-wrap gap-3">
        <SearchField
          id="products-search"
          label={search.label}
          placeholder={search.placeholder}
          maxLength={SEARCH_MAX_LENGTH}
          value={query.q ?? ""}
          onSearch={(text) => go({ q: text || undefined }, { replace: true })}
        />
        <FilterSelect
          id="products-state"
          label={state.label}
          value={query.state}
          options={PRODUCT_STATES.map(({ value, label }) => ({ value, label }))}
          onChange={(value) => go({ state: value as ProductsQuery["state"] })}
        />
        <FilterSelect
          id="products-category"
          label={category.label}
          value={query.category ?? ""}
          options={categoryOptions}
          onChange={(value) => go({ category: value || undefined })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink-soft">{marks.label}</span>
        <MarkChip pressed={query.featured} onToggle={() => go({ featured: !query.featured })}>
          {marks.featured}
        </MarkChip>
        <MarkChip pressed={query.onSale} onToggle={() => go({ onSale: !query.onSale })}>
          {marks.onSale}
        </MarkChip>
        <MarkChip pressed={query.isNew} onToggle={() => go({ isNew: !query.isNew })}>
          {marks.isNew}
        </MarkChip>
        <StockFilter
          value={query.maxStock === undefined ? "" : String(query.maxStock)}
          onChange={(value) =>
            go({ maxStock: value === "" ? undefined : Number(value) }, { replace: true })
          }
        />
        {isFiltered(query) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => go(clearedFilters(query))}
          >
            {clear}
          </Button>
        )}
      </div>
    </div>
  );
};
