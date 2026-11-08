import { useQuery } from "@tanstack/react-query";

import { adminCategoriesApi } from "../infrastructure/admin-categories-client";

/** How many categories there are: the ones not deleted, or only the active or inactive ones. */
export function useCategoriesTotal(status?: "ACTIVE" | "INACTIVE") {
  return useQuery({
    queryKey: ["admin-categories", "total", status ?? "current"],
    queryFn: ({ signal }) => adminCategoriesApi.count(status, signal),
  });
}
