import { useQuery } from "@tanstack/react-query";

import { LOW_STOCK_MAX } from "../domain/admin-product";
import { adminProductsApi } from "../infrastructure/admin-products-client";

/** The products that are running out, the ones with the least stock first. */
export function useLowStockProducts(limit: number) {
  return useQuery({
    queryKey: ["admin-products", "low-stock", limit],
    queryFn: ({ signal }) =>
      adminProductsApi.list(
        { maxStock: LOW_STOCK_MAX, sortBy: "STOCK", sortDir: "ASC", limit },
        signal,
      ),
  });
}
