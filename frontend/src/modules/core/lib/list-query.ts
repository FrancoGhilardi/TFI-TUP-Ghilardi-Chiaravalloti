/** What `URLSearchParams` and Next's `useSearchParams` have in common. */
export interface SearchParamsReader {
  get(name: string): string | null;
}

/** The API refuses pages beyond this one. */
const MAX_PAGE = 500;

/** The text of a parameter without its surrounding spaces, or `undefined` when it has none. */
export const readParam = (params: SearchParamsReader, name: string): string | undefined =>
  params.get(name)?.trim() || undefined;

/** A page number from the address; anything the API would refuse is the first page. */
export function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
}

/** Longest search text a list accepts. */
export const SEARCH_MAX_LENGTH = 100;

/** The search text from the address, cut to what the API accepts; `undefined` when blank. */
export const parseSearch = (value: string | undefined): string | undefined =>
  value?.slice(0, SEARCH_MAX_LENGTH).trim() || undefined;

/** The URL pairs of a list: each parameter under its name in the address, the empty ones left out. */
export function paramPairs<Key extends string>(
  names: Record<Key, string>,
  entries: [Key, string | undefined][],
): [string, string][] {
  return entries
    .filter((entry): entry is [Key, string] => entry[1] !== undefined)
    .map(([param, value]) => [names[param], value]);
}

/** The address of a list: its path and, when there are any, its parameters. */
export function listHref(path: string, pairs: [string, string][]): string {
  const search = new URLSearchParams(pairs).toString();
  return search ? `${path}?${search}` : path;
}
