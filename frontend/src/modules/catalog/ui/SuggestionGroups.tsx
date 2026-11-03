import { searchContent } from "../content/search";
import type { SearchSuggestions } from "../domain/search-term";
import { SearchCategoryItem } from "./SearchCategoryItem";
import { SearchProductItem } from "./SearchProductItem";
import { SearchResultGroup } from "./SearchResultGroup";

interface SuggestionGroupsProps {
  suggestions: SearchSuggestions;
  onNavigate: () => void;
}

const { groups } = searchContent;

/** The products and the categories found, each group only when it has items. */
export const SuggestionGroups = ({ suggestions, onNavigate }: SuggestionGroupsProps) => {
  const { products, categories } = suggestions;
  return (
    <div className="flex flex-col gap-3">
      {products.length > 0 && (
        <SearchResultGroup title={groups.products}>
          {products.map((product) => (
            <li key={product.id}>
              <SearchProductItem product={product} onNavigate={onNavigate} />
            </li>
          ))}
        </SearchResultGroup>
      )}
      {categories.length > 0 && (
        <SearchResultGroup title={groups.categories}>
          {categories.map((category) => (
            <li key={category.id}>
              <SearchCategoryItem category={category} onNavigate={onNavigate} />
            </li>
          ))}
        </SearchResultGroup>
      )}
    </div>
  );
};
