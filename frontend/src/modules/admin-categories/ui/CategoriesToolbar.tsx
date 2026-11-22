import { type FilterOption, FilterSelect } from "@/modules/core/ui/FilterSelect";
import { ListToolbar } from "@/modules/core/ui/ListToolbar";

import { useCategoryOptions } from "../application/useCategoryOptions";
import { categoriesContent } from "../content/categories";
import {
  CATEGORY_STATES,
  type CategoriesQuery,
  clearedFilters,
  isFiltered,
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
    <ListToolbar
      search={{
        id: "categories-search",
        label: search.label,
        placeholder: search.placeholder,
        value: query.q ?? "",
        onSearch: (text) => go({ q: text || undefined }, { replace: true }),
      }}
      clear={isFiltered(query) && { label: clear, onClear: () => go(clearedFilters()) }}
    >
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
    </ListToolbar>
  );
};
