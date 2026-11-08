import { useRouter, useSearchParams } from "next/navigation";

import { parseProductsQuery, type ProductsQuery, productsHref } from "../domain/products-query";

interface NavigateOptions {
  /** Takes the place of the current entry of the history instead of adding one. */
  replace?: boolean;
}

/** The list's query as the address has it, and the way to change it by going to a new address. */
export function useProductsQuery() {
  const router = useRouter();
  const query = parseProductsQuery(useSearchParams());

  const go = (changes: Partial<ProductsQuery>, { replace = false }: NavigateOptions = {}) => {
    const href = productsHref(query, changes);
    if (replace) {
      router.replace(href);
    } else {
      router.push(href);
    }
  };

  return { query, go };
}
