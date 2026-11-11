import { useRouter, useSearchParams } from "next/navigation";

interface NavigateOptions {
  /** Takes the place of the current entry of the history instead of adding one. */
  replace?: boolean;
}

/**
 * The query of a list as the address has it, and the way to change it by going to a new address.
 * Each list brings the rules that read the address (`parse`) and build the link (`hrefOf`).
 */
export function useListQuery<Query>(
  parse: (params: URLSearchParams | ReturnType<typeof useSearchParams>) => Query,
  hrefOf: (query: Query, changes: Partial<Query>) => string,
) {
  const router = useRouter();
  const query = parse(useSearchParams());

  const go = (changes: Partial<Query>, { replace = false }: NavigateOptions = {}) => {
    const href = hrefOf(query, changes);
    if (replace) {
      router.replace(href);
    } else {
      router.push(href);
    }
  };

  return { query, go };
}
