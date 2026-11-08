import { useQuery } from "@tanstack/react-query";

import { adminCategoriesApi } from "../infrastructure/admin-categories-client";

/** Every category that is not deleted, in tree order, to pick one in a filter. */
export function useCategoryOptions() {
  return useQuery({
    queryKey: ["admin-categories", "options"],
    queryFn: ({ signal }) => adminCategoriesApi.listAll(signal),
  });
}
