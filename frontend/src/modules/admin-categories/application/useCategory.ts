import { useQuery } from "@tanstack/react-query";

import { adminCategoriesApi } from "../infrastructure/admin-categories-client";

/** A category as the edit form shows it; refreshed whenever the categories are read again. */
export function useCategory(id: string) {
  return useQuery({
    queryKey: ["admin-categories", "detail", id],
    // Dropped once nobody shows it: reopening starts from what the server has, never from a copy
    // that was marked stale after a save.
    gcTime: 0,
    queryFn: ({ signal }) => adminCategoriesApi.get(id, signal),
  });
}
