import { useQuery } from "@tanstack/react-query";

import { adminProductsApi } from "../infrastructure/admin-products-client";

/** A product as the edit form shows it; refreshed whenever the products are read again. */
export function useProduct(id: string) {
  return useQuery({
    queryKey: ["admin-products", "detail", id],
    queryFn: ({ signal }) => adminProductsApi.get(id, signal),
  });
}
