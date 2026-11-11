import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { type CategoriesQuery, toApiQuery } from "../domain/categories-query";
import { adminCategoriesApi } from "../infrastructure/admin-categories-client";

/** The page of categories a query asks for; while the next one loads, the table keeps the last. */
export function useAdminCategories(query: CategoriesQuery) {
  const params = toApiQuery(query);
  return useQuery({
    queryKey: ["admin-categories", "list", params],
    queryFn: ({ signal }) => adminCategoriesApi.list(params, signal),
    placeholderData: keepPreviousData,
  });
}
