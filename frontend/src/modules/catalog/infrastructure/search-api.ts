import { z } from "zod";

import { apiClient, parseResponse } from "@/modules/core/http";

import { SEARCH_RESULT_LIMIT, type SearchSuggestions } from "../domain/search-term";
import { productCardSchema, toProductCard } from "./product-card-dto";

/** `GlobalSearchResponseDto` of the API. */
const searchSchema = z.object({
  products: z.array(productCardSchema),
  categories: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
});

/** Products and categories matching `term`, read from the browser; `signal` cancels the request. */
export async function searchStore(term: string, signal?: AbortSignal): Promise<SearchSuggestions> {
  const body = await apiClient.get<unknown>("/search", {
    query: { q: term, limit: SEARCH_RESULT_LIMIT },
    signal,
  });
  const { products, categories } = parseResponse(searchSchema, body);
  return { products: products.map(toProductCard), categories };
}
