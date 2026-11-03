import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useDebouncedValue } from "@/modules/core/hooks/useDebouncedValue";

import { searchableTerm } from "../domain/catalog-query";
import { SEARCH_DEBOUNCE_MS, type SearchSuggestions } from "../domain/search-term";
import { searchStore } from "../infrastructure/search-api";

export type StoreSearchStatus = "idle" | "loading" | "error" | "success";

export interface StoreSearchState {
  /** What was actually searched: the debounced text, once long enough. */
  term: string | undefined;
  status: StoreSearchStatus;
  /** Answer for `term`; while the next term loads, the answer to the one before stays. */
  suggestions: SearchSuggestions | undefined;
  retry: () => void;
}

/** Suggestions for what is being typed, asked once the visitor pauses. */
export function useStoreSearch(text: string): StoreSearchState {
  const debounced = searchableTerm(useDebouncedValue(text, SEARCH_DEBOUNCE_MS));
  // Clearing the field must not leave the old suggestions up while the pause runs out.
  const term = searchableTerm(text) === undefined ? undefined : debounced;
  const query = useQuery({
    queryKey: ["store-search", term],
    queryFn: ({ signal }) => searchStore(term ?? "", signal),
    enabled: term !== undefined,
  });

  // The last answer, kept while the next term loads so the list does not flicker; dropped as
  // soon as there is no term, so it never shows under one typed after the field was cleared.
  const [previous, setPrevious] = useState<SearchSuggestions>();
  if (term === undefined) {
    if (previous) {
      setPrevious(undefined);
    }
  } else if (query.data && query.data !== previous) {
    setPrevious(query.data);
  }

  let status: StoreSearchStatus = "idle";
  if (term !== undefined) {
    if (query.data) {
      status = "success";
    } else {
      status = query.isError ? "error" : "loading";
    }
  }
  return {
    term,
    status,
    suggestions: term === undefined ? undefined : (query.data ?? previous),
    retry: () => void query.refetch(),
  };
}
