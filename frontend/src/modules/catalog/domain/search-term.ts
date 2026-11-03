import { catalogHref, EMPTY_CATALOG_QUERY } from "./catalog-query";
import type { ProductCard } from "./product-card";

/** How long the visitor must stop typing before the store is asked. */
export const SEARCH_DEBOUNCE_MS = 300;

/** Suggestions asked for in each group. */
export const SEARCH_RESULT_LIMIT = 5;

/** A category found by the search, without its tree. */
export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface SearchSuggestions {
  products: ProductCard[];
  categories: CategorySummary[];
}

/** The catalog filtered by `term` alone: a global search leaves the catalog's own filters out. */
export function searchResultsHref(term: string): string {
  return catalogHref(EMPTY_CATALOG_QUERY, { q: term });
}

export function hasSuggestions({ products, categories }: SearchSuggestions): boolean {
  return products.length > 0 || categories.length > 0;
}
