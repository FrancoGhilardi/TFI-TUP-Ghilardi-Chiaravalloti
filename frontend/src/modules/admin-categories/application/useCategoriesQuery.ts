import { useListQuery } from "@/modules/core/hooks/useListQuery";

import { categoriesHref, parseCategoriesQuery } from "../domain/categories-query";

/** The list's query as the address has it, and the way to change it by going to a new address. */
export function useCategoriesQuery() {
  return useListQuery(parseCategoriesQuery, categoriesHref);
}
