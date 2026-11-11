import { ADMIN_PATHS } from "@/modules/auth";
import { parsePage, readParam, type SearchParamsReader } from "@/modules/core/lib/list-query";

export const CATEGORIES_PATH = ADMIN_PATHS.categories;
export const CATEGORIES_PAGE_SIZE = 50;

export const SEARCH_MAX_LENGTH = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** States to list: the value in the URL, the label shown and the value the API expects. */
export const CATEGORY_STATES = [
  { value: "vigentes", label: "Vigentes", api: undefined },
  { value: "activas", label: "Activas", api: "ACTIVE" },
  { value: "inactivas", label: "Inactivas", api: "INACTIVE" },
  { value: "bajas", label: "Dadas de baja", api: "DELETED" },
  { value: "todas", label: "Todas", api: "ALL" },
] as const;

export type CategoryStateFilter = (typeof CATEGORY_STATES)[number]["value"];

const DEFAULT_STATE: CategoryStateFilter = "vigentes";

/** Names of the query parameters of the categories list, in Spanish like every URL of the app. */
export const CATEGORIES_PARAMS = {
  q: "q",
  state: "estado",
  parent: "padre",
  page: "pagina",
} as const;

export interface CategoriesQuery {
  q?: string;
  state: CategoryStateFilter;
  /** Id of a category: only its direct subcategories are listed. */
  parent?: string;
  page: number;
}

export const EMPTY_CATEGORIES_QUERY: CategoriesQuery = { state: DEFAULT_STATE, page: 1 };

/** Parameters of `GET /admin/categories` for a query. */
export interface CategoriesApiParams {
  q?: string;
  status?: "ACTIVE" | "INACTIVE" | "DELETED" | "ALL";
  parentId?: string;
  page?: number;
  limit?: number;
}

const isState = (value: string | undefined): value is CategoryStateFilter =>
  CATEGORY_STATES.some((state) => state.value === value);

/** Reads the address of the list; any invalid value is dropped so the API never receives it. */
export function parseCategoriesQuery(params: SearchParamsReader): CategoriesQuery {
  const read = (name: keyof typeof CATEGORIES_PARAMS) => readParam(params, CATEGORIES_PARAMS[name]);

  const q = read("q");
  const state = read("state");
  const parent = read("parent")?.toLowerCase();

  return {
    q: q?.slice(0, SEARCH_MAX_LENGTH).trim() || undefined,
    state: isState(state) ? state : DEFAULT_STATE,
    parent: parent && UUID.test(parent) ? parent : undefined,
    page: parsePage(read("page")),
  };
}

/** The query as URL pairs, without defaults. */
function paramEntries(query: CategoriesQuery): [string, string][] {
  const entries: [keyof typeof CATEGORIES_PARAMS, string | undefined][] = [
    ["q", query.q],
    ["state", query.state === DEFAULT_STATE ? undefined : query.state],
    ["parent", query.parent],
    ["page", query.page === 1 ? undefined : String(query.page)],
  ];
  return entries
    .filter((entry): entry is [keyof typeof CATEGORIES_PARAMS, string] => entry[1] !== undefined)
    .map(([param, value]) => [CATEGORIES_PARAMS[param], value]);
}

/**
 * Link to the list with `changes` applied. Any change other than the page itself goes back to the
 * first page, since the old page number means nothing for the new results.
 */
export function categoriesHref(
  query: CategoriesQuery,
  changes: Partial<CategoriesQuery> = {},
): string {
  const next: CategoriesQuery = { ...query, ...changes, page: changes.page ?? 1 };
  const search = new URLSearchParams(paramEntries(next)).toString();
  return search ? `${CATEGORIES_PATH}?${search}` : CATEGORIES_PATH;
}

/** Whether anything narrows the list: a search, a location or another state than the default. */
export function isFiltered(query: CategoriesQuery): boolean {
  return query.q !== undefined || query.state !== DEFAULT_STATE || query.parent !== undefined;
}

/** The changes that take away every search and filter. */
export function clearedFilters(): Partial<CategoriesQuery> {
  return { q: undefined, state: DEFAULT_STATE, parent: undefined };
}

/** Whether the API follows the tree (each category after its parent): no search, no location. */
export function isTreeMode(query: CategoriesQuery): boolean {
  return query.q === undefined && query.parent === undefined;
}

/** The request to the API for a query. */
export function toApiQuery(query: CategoriesQuery): CategoriesApiParams {
  return {
    q: query.q,
    status: CATEGORY_STATES.find(({ value }) => value === query.state)?.api,
    parentId: query.parent,
    page: query.page,
    limit: CATEGORIES_PAGE_SIZE,
  };
}
