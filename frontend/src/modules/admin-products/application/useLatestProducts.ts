import { useQuery } from "@tanstack/react-query";

import { adminProductsApi } from "../infrastructure/admin-products-client";

/** The products modified most recently. */
export function useLatestProducts(limit: number) {
  return useQuery({
    queryKey: ["admin-products", "latest", limit],
    queryFn: async ({ signal }) =>
      (await adminProductsApi.list({ sortBy: "UPDATED_AT", sortDir: "DESC", limit }, signal)).items,
  });
}
