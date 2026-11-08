import { useQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "@/modules/core/hooks/useDebouncedValue";

import { adminProductsApi } from "../infrastructure/admin-products-client";

const SEARCH_PAUSE_MS = 300;
const RESULTS = 10;

/**
 * Current products that match the text typed, to pick related ones from. The ones in `excluded`
 * (the product itself, those already chosen) are left out of the results.
 */
export function useRelatedSearch(text: string, excluded: readonly string[]) {
  const term = useDebouncedValue(text.trim(), SEARCH_PAUSE_MS);
  // Asks for as many more as will be left out, so the list still has its full length.
  const limit = RESULTS + excluded.length;
  const query = useQuery({
    queryKey: ["admin-products", "related-search", term, limit],
    queryFn: ({ signal }) =>
      adminProductsApi.list(
        { q: term || undefined, sortBy: "TITLE", sortDir: "ASC", limit },
        signal,
      ),
    placeholderData: (previous) => previous,
  });

  return {
    results: (query.data?.items ?? []).filter(({ id }) => !excluded.includes(id)),
    isLoading: query.isPending || term !== text.trim(),
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}
