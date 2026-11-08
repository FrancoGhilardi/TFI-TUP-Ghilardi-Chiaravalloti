import { ADMIN_PATHS } from "@/modules/auth";

export const PRODUCTS_PATH = ADMIN_PATHS.products;
export const PRODUCTS_PAGE_SIZE = 20;

/** The API refuses pages beyond this one. */
const MAX_PAGE = 500;
export const SEARCH_MAX_LENGTH = 100;
/** Biggest stock the API accepts. */
const MAX_STOCK = 2_147_483_647;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** States to list: the value in the URL, the label shown and the value the API expects. */
export const PRODUCT_STATES = [
  { value: "vigentes", label: "Vigentes", api: undefined },
  { value: "activos", label: "Activos", api: "ACTIVE" },
  { value: "inactivos", label: "Inactivos", api: "INACTIVE" },
  { value: "bajas", label: "Dados de baja", api: "DELETED" },
  { value: "todos", label: "Todos", api: "ALL" },
] as const;

export type ProductStateFilter = (typeof PRODUCT_STATES)[number]["value"];

/** Columns the table can be sorted by, in the URL and as the API names them. */
export const PRODUCT_SORTS = [
  { value: "titulo", api: "TITLE" },
  { value: "sku", api: "SKU" },
  { value: "precio", api: "PRICE" },
  { value: "stock", api: "STOCK" },
  { value: "modificado", api: "UPDATED_AT" },
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number]["value"];
export type SortDirection = "asc" | "desc";

const DEFAULT_STATE: ProductStateFilter = "vigentes";
const DEFAULT_SORT: ProductSort = "modificado";

/** A column starts in the order that makes sense for it: newest first, everything else A to Z. */
export const defaultDirection = (sort: ProductSort): SortDirection =>
  sort === "modificado" ? "desc" : "asc";

/** Names of the query parameters of the products list, in Spanish like every URL of the app. */
export const PRODUCTS_PARAMS = {
  q: "q",
  state: "estado",
  category: "categoria",
  featured: "destacados",
  onSale: "oferta",
  isNew: "novedad",
  maxStock: "stock",
  sort: "orden",
  direction: "dir",
  page: "pagina",
} as const;

export interface ProductsQuery {
  q?: string;
  state: ProductStateFilter;
  /** Id of a category; its subcategories are included. */
  category?: string;
  featured: boolean;
  onSale: boolean;
  isNew: boolean;
  maxStock?: number;
  sort: ProductSort;
  direction: SortDirection;
  page: number;
}

export const EMPTY_PRODUCTS_QUERY: ProductsQuery = {
  state: DEFAULT_STATE,
  featured: false,
  onSale: false,
  isNew: false,
  sort: DEFAULT_SORT,
  direction: defaultDirection(DEFAULT_SORT),
  page: 1,
};

/** What `URLSearchParams` and Next's `useSearchParams` have in common. */
export interface SearchParamsReader {
  get(name: string): string | null;
}

/** Parameters of `GET /admin/products` for a query. */
export interface ProductsApiParams {
  q?: string;
  status?: "ACTIVE" | "INACTIVE" | "DELETED" | "ALL";
  categoryId?: string;
  isFeatured?: boolean;
  isOnSale?: boolean;
  isNew?: boolean;
  maxStock?: number;
  sortBy?: "TITLE" | "SKU" | "PRICE" | "STOCK" | "UPDATED_AT";
  sortDir?: "ASC" | "DESC";
  page?: number;
  limit?: number;
}

function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
}

function parseStock(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value)) {
    return undefined;
  }
  const stock = Number(value);
  return stock <= MAX_STOCK ? stock : undefined;
}

const isSort = (value: string | undefined): value is ProductSort =>
  PRODUCT_SORTS.some((sort) => sort.value === value);

const isState = (value: string | undefined): value is ProductStateFilter =>
  PRODUCT_STATES.some((state) => state.value === value);

/** Reads the address of the list; any invalid value is dropped so the API never receives it. */
export function parseProductsQuery(params: SearchParamsReader): ProductsQuery {
  const read = (name: keyof typeof PRODUCTS_PARAMS) =>
    params.get(PRODUCTS_PARAMS[name])?.trim() || undefined;

  const q = read("q");
  const state = read("state");
  const category = read("category")?.toLowerCase();
  const sortValue = read("sort");
  const sort = isSort(sortValue) ? sortValue : DEFAULT_SORT;
  const direction = read("direction");

  return {
    q: q && q.length <= SEARCH_MAX_LENGTH ? q : undefined,
    state: isState(state) ? state : DEFAULT_STATE,
    category: category && UUID.test(category) ? category : undefined,
    featured: read("featured") === "true",
    onSale: read("onSale") === "true",
    isNew: read("isNew") === "true",
    maxStock: parseStock(read("maxStock")),
    sort,
    direction: direction === "asc" || direction === "desc" ? direction : defaultDirection(sort),
    page: parsePage(read("page")),
  };
}

/** The query as URL pairs, without defaults. */
function paramEntries(query: ProductsQuery): [string, string][] {
  const entries: [keyof typeof PRODUCTS_PARAMS, string | undefined][] = [
    ["q", query.q],
    ["state", query.state === DEFAULT_STATE ? undefined : query.state],
    ["category", query.category],
    ["featured", query.featured ? "true" : undefined],
    ["onSale", query.onSale ? "true" : undefined],
    ["isNew", query.isNew ? "true" : undefined],
    ["maxStock", query.maxStock === undefined ? undefined : String(query.maxStock)],
    ["sort", query.sort === DEFAULT_SORT ? undefined : query.sort],
    ["direction", query.direction === defaultDirection(query.sort) ? undefined : query.direction],
    ["page", query.page === 1 ? undefined : String(query.page)],
  ];
  return entries
    .filter((entry): entry is [keyof typeof PRODUCTS_PARAMS, string] => entry[1] !== undefined)
    .map(([param, value]) => [PRODUCTS_PARAMS[param], value]);
}

/**
 * Link to the list with `changes` applied. Any change other than the page itself goes back to the
 * first page, since the old page number means nothing for the new results.
 */
export function productsHref(query: ProductsQuery, changes: Partial<ProductsQuery> = {}): string {
  const next: ProductsQuery = { ...query, ...changes, page: changes.page ?? 1 };
  const search = new URLSearchParams(paramEntries(next)).toString();
  return search ? `${PRODUCTS_PATH}?${search}` : PRODUCTS_PATH;
}

/** What to change to sort by `column`: flip the order if it already is the column, else start it. */
export function nextSort(
  query: ProductsQuery,
  column: ProductSort,
): Pick<ProductsQuery, "sort" | "direction"> {
  if (query.sort === column) {
    return { sort: column, direction: query.direction === "asc" ? "desc" : "asc" };
  }
  return { sort: column, direction: defaultDirection(column) };
}

/** Whether anything narrows the list: a search, a filter or another state than the default. */
export function isFiltered(query: ProductsQuery): boolean {
  return (
    query.q !== undefined ||
    query.state !== DEFAULT_STATE ||
    query.category !== undefined ||
    query.featured ||
    query.onSale ||
    query.isNew ||
    query.maxStock !== undefined
  );
}

/** The changes that take away every search and filter, keeping the sort. */
export function clearedFilters(query: ProductsQuery): Partial<ProductsQuery> {
  return {
    q: undefined,
    state: DEFAULT_STATE,
    category: undefined,
    featured: false,
    onSale: false,
    isNew: false,
    maxStock: undefined,
    sort: query.sort,
    direction: query.direction,
  };
}

/** The request to the API for a query. */
export function toApiQuery(query: ProductsQuery): ProductsApiParams {
  return {
    q: query.q,
    status: PRODUCT_STATES.find(({ value }) => value === query.state)?.api,
    categoryId: query.category,
    isFeatured: query.featured || undefined,
    isOnSale: query.onSale || undefined,
    isNew: query.isNew || undefined,
    maxStock: query.maxStock,
    sortBy: PRODUCT_SORTS.find(({ value }) => value === query.sort)?.api,
    sortDir: query.direction === "asc" ? "ASC" : "DESC",
    page: query.page,
    limit: PRODUCTS_PAGE_SIZE,
  };
}
