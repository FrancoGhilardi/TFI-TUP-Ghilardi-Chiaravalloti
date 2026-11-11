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
