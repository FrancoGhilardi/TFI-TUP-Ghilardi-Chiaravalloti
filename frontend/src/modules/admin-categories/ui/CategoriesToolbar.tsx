import { useCategoryOptions } from "../application/useCategoryOptions";
import { Button } from "@/modules/core/ui/primitives/button";
import { type FilterOption, FilterSelect } from "@/modules/core/ui/FilterSelect";
import { SearchField } from "@/modules/core/ui/SearchField";

import { categoriesContent } from "../content/categories";
import {
  CATEGORY_STATES,
  type CategoriesQuery,
  clearedFilters,
  isFiltered,
  SEARCH_MAX_LENGTH,
} from "../domain/categories-query";
import { idsWithChildren } from "../domain/category-tree";

interface CategoriesToolbarProps {
  query: CategoriesQuery;
  go: (changes: Partial<CategoriesQuery>, options?: { replace?: boolean }) => void;
}

export const CategoriesToolbar = ({ query, go }: CategoriesToolbarProps) => {
  const { data: categories = [] } = useCategoryOptions();
  const { search, state, location, clear } = categoriesContent;

  const withChildren = idsWithChildren(categories);
  const locationOptions: FilterOption[] = [
    { value: "", label: location.any },
    ...categories
      .filter(({ id }) => withChildren.has(id))
      .map(({ id, name, depth }) => ({
        value: id,
        label: `${" ".repeat(depth)}${location.within(name)}`,
      })),
  ];
  // A location in the address that is not on the list (it failed to load, or it has no
  // subcategories any more) must not make the select show "any" while the list is filtered.
  if (query.parent && !locationOptions.some(({ value }) => value === query.parent)) {
    locationOptions.push({ value: query.parent, label: location.chosen });
  }

  return (
    <div className="flex flex-col gap-3 border-b border-line-soft p-4">
      <div className="flex flex-wrap gap-3">
        <SearchField
          id="categories-search"
          label={search.label}
          placeholder={search.placeholder}
          maxLength={SEARCH_MAX_LENGTH}
          value={query.q ?? ""}
          onSearch={(text) => go({ q: text || undefined }, { replace: true })}
        />
        <FilterSelect
          id="categories-state"
          label={state.label}
          value={query.state}
          options={CATEGORY_STATES.map(({ value, label }) => ({ value, label }))}
          onChange={(value) => go({ state: value as CategoriesQuery["state"] })}
        />
        <FilterSelect
          id="categories-location"
          label={location.label}
          value={query.parent ?? ""}
          options={locationOptions}
          onChange={(value) => go({ parent: value || undefined })}
        />
        {isFiltered(query) && (
          <Button type="button" variant="ghost" onClick={() => go(clearedFilters())}>
            {clear}
          </Button>
        )}
      </div>
    </div>
  );
};
