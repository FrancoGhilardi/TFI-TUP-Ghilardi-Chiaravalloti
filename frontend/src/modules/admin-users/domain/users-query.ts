import { ADMIN_PATHS } from "@/modules/auth";
import { parsePage, readParam, type SearchParamsReader } from "@/modules/core/lib/list-query";

export const USERS_PATH = ADMIN_PATHS.users;
export const USERS_PAGE_SIZE = 20;
export const SEARCH_MAX_LENGTH = 100;

/** States to list: the value in the URL, the label shown and the value the API expects. */
export const USER_STATES = [
  { value: "vigentes", label: "Vigentes", api: undefined },
  { value: "activos", label: "Activos", api: "ACTIVE" },
  { value: "inactivos", label: "Inactivos", api: "INACTIVE" },
  { value: "bajas", label: "Dados de baja", api: "DELETED" },
  { value: "todos", label: "Todos", api: "ALL" },
] as const;

/** Roles to filter by: the value in the URL, the label shown and the value the API expects. */
export const USER_ROLE_FILTERS = [
  { value: "admin", label: "Administradores", api: "ADMIN" },
  { value: "vendedor", label: "Vendedores", api: "SELLER" },
] as const;

export type UserStateFilter = (typeof USER_STATES)[number]["value"];
export type UserRoleFilter = (typeof USER_ROLE_FILTERS)[number]["value"];

const DEFAULT_STATE: UserStateFilter = "vigentes";

/** Names of the query parameters of the users list, in Spanish like every URL of the app. */
export const USERS_PARAMS = {
  q: "q",
  role: "rol",
  state: "estado",
  page: "pagina",
} as const;

export interface UsersQuery {
  q?: string;
  /** Without one, every role. */
  role?: UserRoleFilter;
  state: UserStateFilter;
  page: number;
}

export const EMPTY_USERS_QUERY: UsersQuery = { state: DEFAULT_STATE, page: 1 };

/** Parameters of `GET /admin/users` for a query. */
export interface UsersApiParams {
  q?: string;
  role?: "ADMIN" | "SELLER";
  status?: "ACTIVE" | "INACTIVE" | "DELETED" | "ALL";
  page?: number;
  limit?: number;
}

const isState = (value: string | undefined): value is UserStateFilter =>
  USER_STATES.some((state) => state.value === value);

const isRole = (value: string | undefined): value is UserRoleFilter =>
  USER_ROLE_FILTERS.some((role) => role.value === value);

/** Reads the address of the list; any invalid value is dropped so the API never receives it. */
export function parseUsersQuery(params: SearchParamsReader): UsersQuery {
  const read = (name: keyof typeof USERS_PARAMS) => readParam(params, USERS_PARAMS[name]);

  const q = read("q");
  const role = read("role");
  const state = read("state");

  return {
    q: q?.slice(0, SEARCH_MAX_LENGTH).trim() || undefined,
    role: isRole(role) ? role : undefined,
    state: isState(state) ? state : DEFAULT_STATE,
    page: parsePage(read("page")),
  };
}

/** The query as URL pairs, without defaults. */
function paramEntries(query: UsersQuery): [string, string][] {
  const entries: [keyof typeof USERS_PARAMS, string | undefined][] = [
    ["q", query.q],
    ["role", query.role],
    ["state", query.state === DEFAULT_STATE ? undefined : query.state],
    ["page", query.page === 1 ? undefined : String(query.page)],
  ];
  return entries
    .filter((entry): entry is [keyof typeof USERS_PARAMS, string] => entry[1] !== undefined)
    .map(([param, value]) => [USERS_PARAMS[param], value]);
}

/**
 * Link to the list with `changes` applied. Any change other than the page itself goes back to the
 * first page, since the old page number means nothing for the new results.
 */
export function usersHref(query: UsersQuery, changes: Partial<UsersQuery> = {}): string {
  const next: UsersQuery = { ...query, ...changes, page: changes.page ?? 1 };
  const search = new URLSearchParams(paramEntries(next)).toString();
  return search ? `${USERS_PATH}?${search}` : USERS_PATH;
}

/** Whether anything narrows the list: a search, a role or another state than the default. */
export function isFiltered(query: UsersQuery): boolean {
  return query.q !== undefined || query.role !== undefined || query.state !== DEFAULT_STATE;
}

/** The changes that take away every search and filter. */
export function clearedFilters(): Partial<UsersQuery> {
  return { q: undefined, role: undefined, state: DEFAULT_STATE };
}

/** The request to the API for a query. */
export function toApiQuery(query: UsersQuery): UsersApiParams {
  return {
    q: query.q,
    role: USER_ROLE_FILTERS.find(({ value }) => value === query.role)?.api,
    status: USER_STATES.find(({ value }) => value === query.state)?.api,
    page: query.page,
    limit: USERS_PAGE_SIZE,
  };
}
