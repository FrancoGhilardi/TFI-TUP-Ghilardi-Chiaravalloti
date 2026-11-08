import { useQuery } from "@tanstack/react-query";

import { adminProductsApi } from "../infrastructure/admin-products-client";

/** How many products there are: the ones not deleted, or only the active or inactive ones. */
export function useProductsTotal(status?: "ACTIVE" | "INACTIVE") {
  return useQuery({
    queryKey: ["admin-products", "total", status ?? "current"],
    queryFn: async ({ signal }) =>
      (await adminProductsApi.list({ status, limit: 1 }, signal)).total,
  });
}
