import { useQuery } from "@tanstack/react-query";

import { adminCategoriesApi } from "../infrastructure/admin-categories-client";

/** A category as the edit form shows it; refreshed whenever the categories are read again. */
export function useCategory(id: string) {
  return useQuery({
    queryKey: ["admin-categories", "detail", id],
    queryFn: ({ signal }) => adminCategoriesApi.get(id, signal),
  });
}
