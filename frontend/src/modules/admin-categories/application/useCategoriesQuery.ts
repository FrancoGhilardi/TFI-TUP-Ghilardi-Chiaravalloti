import { useRouter, useSearchParams } from "next/navigation";

import {
  type CategoriesQuery,
  categoriesHref,
  parseCategoriesQuery,
} from "../domain/categories-query";

interface NavigateOptions {
  /** Takes the place of the current entry of the history instead of adding one. */
  replace?: boolean;
}

/** The list's query as the address has it, and the way to change it by going to a new address. */
export function useCategoriesQuery() {
  const router = useRouter();
  const query = parseCategoriesQuery(useSearchParams());

  const go = (changes: Partial<CategoriesQuery>, { replace = false }: NavigateOptions = {}) => {
    const href = categoriesHref(query, changes);
    if (replace) {
      router.replace(href);
    } else {
      router.push(href);
    }
  };

  return { query, go };
}
