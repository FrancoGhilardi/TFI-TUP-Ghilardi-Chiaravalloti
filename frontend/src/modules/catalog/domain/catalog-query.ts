import { CATALOG_PATH } from "./product-routes";

export const CATALOG_PAGE_SIZE = 20;

/** The API refuses pages beyond this one. */
const MAX_PAGE = 500;
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;
/** Longest category slug the API accepts. */
const CATEGORY_MAX_LENGTH = 120;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Sort options: the public value in the URL, the label shown and the value the API expects. */
export const CATALOG_SORTS = [
  { value: "relevancia", label: "Relevancia", api: "RELEVANCE" },
  { value: "menor-precio", label: "Menor precio", api: "PRICE_ASC" },
  { value: "mayor-precio", label: "Mayor precio", api: "PRICE_DESC" },
  { value: "recientes", label: "Más recientes", api: "NEWEST" },
  { value: "a-z", label: "A-Z", api: "TITLE_ASC" },
] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number]["value"];

const DEFAULT_SORT: CatalogSort = "relevancia";

/** Names of the public query parameters, in Spanish like every store URL. */
export const CATALOG_PARAMS = {
  q: "q",
  category: "categoria",
  featured: "destacados",
  newArrivals: "novedades",
  sort: "orden",
  page: "pagina",
} as const;

export interface CatalogQuery {
  q?: string;
  /** Category slug; its subcategories are included. */
  category?: string;
  featured: boolean;
  newArrivals: boolean;
  sort: CatalogSort;
  page: number;
}

export const EMPTY_CATALOG_QUERY: CatalogQuery = {
  featured: false,
  newArrivals: false,
  sort: DEFAULT_SORT,
  page: 1,
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type CatalogParam = keyof typeof CATALOG_PARAMS;

function firstValue(raw: RawSearchParams, param: CatalogParam): string | undefined {
  const value = raw[CATALOG_PARAMS[param]];
  return (Array.isArray(value) ? value[0] : value)?.trim();
}

function parseSearch(value: string | undefined): string | undefined {
  return value && value.length >= SEARCH_MIN_LENGTH && value.length <= SEARCH_MAX_LENGTH
    ? value
    : undefined;
}

function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
}

function isSort(value: string | undefined): value is CatalogSort {
  return CATALOG_SORTS.some((sort) => sort.value === value);
}

/** Reads the catalog URL; any invalid value is dropped so the API never receives it. */
export function parseCatalogQuery(raw: RawSearchParams): CatalogQuery {
  const category = firstValue(raw, "category");
  const sort = firstValue(raw, "sort");
  return {
    q: parseSearch(firstValue(raw, "q")),
    category:
      category && category.length <= CATEGORY_MAX_LENGTH && SLUG.test(category)
        ? category
        : undefined,
    featured: firstValue(raw, "featured") === "true",
    newArrivals: firstValue(raw, "newArrivals") === "true",
    sort: isSort(sort) ? sort : DEFAULT_SORT,
    page: parsePage(firstValue(raw, "page")),
  };
}

/** The query as URL pairs, without defaults, optionally leaving some parameters out. */
export function catalogParamEntries(
  query: CatalogQuery,
  except: CatalogParam[] = [],
): [string, string][] {
  const entries: [CatalogParam, string | undefined][] = [
    ["q", query.q],
    ["category", query.category],
    ["featured", query.featured ? "true" : undefined],
    ["newArrivals", query.newArrivals ? "true" : undefined],
    ["sort", query.sort === DEFAULT_SORT ? undefined : query.sort],
    ["page", query.page === 1 ? undefined : String(query.page)],
  ];
  return entries
    .filter((entry): entry is [CatalogParam, string] => entry[1] !== undefined)
    .filter(([param]) => !except.includes(param))
    .map(([param, value]) => [CATALOG_PARAMS[param], value]);
}

/**
 * Link to the catalog with `changes` applied. Any change other than the page itself goes back to
 * the first page, since the old page number means nothing for the new results.
 */
export function catalogHref(query: CatalogQuery, changes: Partial<CatalogQuery> = {}): string {
  const next: CatalogQuery = { ...query, ...changes, page: changes.page ?? 1 };
  const search = new URLSearchParams(catalogParamEntries(next)).toString();
  return search ? `${CATALOG_PATH}?${search}` : CATALOG_PATH;
}

/**
 * Where the visitor should be for `raw`: the same URL written the way the store writes it, or
 * `undefined` when it already is. Invalid or redundant values (`pagina=9999`, `orden=relevancia`)
 * would otherwise leave a misleading address and duplicate pages for search engines.
 */
export function canonicalCatalogHref(raw: RawSearchParams): string | undefined {
  const query = parseCatalogQuery(raw);
  const canonical = catalogHref(query, { page: query.page });
  const current = new URLSearchParams();
  for (const [name, value] of Object.entries(raw)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) {
        current.append(name, item);
      }
    }
  }
  const currentHref = current.size > 0 ? `${CATALOG_PATH}?${current}` : CATALOG_PATH;
  return currentHref === canonical ? undefined : canonical;
}

/** The query without search, category or flags; the sort stays, since it is not a filter. */
export const WITHOUT_FILTERS: Partial<CatalogQuery> = {
  q: undefined,
  category: undefined,
  featured: false,
  newArrivals: false,
};

export function categoryHref(slug: string): string {
  return catalogHref(EMPTY_CATALOG_QUERY, { category: slug });
}

export const FEATURED_CATALOG_HREF = catalogHref(EMPTY_CATALOG_QUERY, { featured: true });
export const NEW_ARRIVALS_CATALOG_HREF = catalogHref(EMPTY_CATALOG_QUERY, { newArrivals: true });

// A type alias rather than an interface, so it can be passed as the client's query parameters.
export type CatalogApiParams = {
  q?: string;
  categorySlug?: string;
  isFeatured?: true;
  isNew?: true;
  sort: (typeof CATALOG_SORTS)[number]["api"];
  page: number;
  limit: number;
};

/** The query as `GET /products` parameters. */
export function toApiParams(query: CatalogQuery): CatalogApiParams {
  const sort = CATALOG_SORTS.find(({ value }) => value === query.sort) ?? CATALOG_SORTS[0];
  return {
    q: query.q,
    categorySlug: query.category,
    isFeatured: query.featured || undefined,
    isNew: query.newArrivals || undefined,
    sort: sort.api,
    page: query.page,
    limit: CATALOG_PAGE_SIZE,
  };
}
