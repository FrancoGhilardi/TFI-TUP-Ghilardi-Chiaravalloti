import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { type ProductsQuery, toApiQuery } from "../domain/products-query";
import { adminProductsApi } from "../infrastructure/admin-products-client";

/** The page of products a query asks for; while the next one loads, the table keeps the last. */
export function useAdminProducts(query: ProductsQuery) {
  const params = toApiQuery(query);
  return useQuery({
    queryKey: ["admin-products", "list", params],
    queryFn: ({ signal }) => adminProductsApi.list(params, signal),
    placeholderData: keepPreviousData,
  });
}
