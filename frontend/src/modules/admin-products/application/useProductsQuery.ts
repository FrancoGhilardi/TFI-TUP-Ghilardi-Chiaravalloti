import { useListQuery } from "@/modules/core/hooks/useListQuery";

import { parseProductsQuery, productsHref } from "../domain/products-query";

/** The list's query as the address has it, and the way to change it by going to a new address. */
export function useProductsQuery() {
  return useListQuery(parseProductsQuery, productsHref);
}
