import { describe, expect, it } from "vitest";

import {
  type CategoriesQuery,
  categoriesHref,
  clearedFilters,
  EMPTY_CATEGORIES_QUERY,
  isFiltered,
  isTreeMode,
  parseCategoriesQuery,
  toApiQuery,
} from "./categories-query";

const PARENT = "3f2b8c1e-5a4d-4e6f-9b0a-1c2d3e4f5a6b";

const parse = (search: string) => parseCategoriesQuery(new URLSearchParams(search));
const query = (overrides: Partial<CategoriesQuery> = {}): CategoriesQuery => ({
  ...EMPTY_CATEGORIES_QUERY,
  ...overrides,
});

describe("parseCategoriesQuery", () => {
  it("gives the default query for an empty address", () => {
    expect(parse("")).toEqual(EMPTY_CATEGORIES_QUERY);
  });

  it("reads every parameter", () => {
    expect(parse(`q=libros&estado=bajas&padre=${PARENT}&pagina=3`)).toEqual({
      q: "libros",
      state: "bajas",
      parent: PARENT,
      page: 3,
    });
  });

  it("trims the search and drops it when blank or too long", () => {
    expect(parse("q=%20%20lapiz%20").q).toBe("lapiz");
    expect(parse("q=%20").q).toBeUndefined();
    expect(parse(`q=${"a".repeat(101)}`).q).toHaveLength(100);
    expect(parse(`q=${"a".repeat(100)}`).q).toHaveLength(100);
  });

  it.each(["borradas", "ACTIVAS", ""])("falls back to the default state for %j", (value) => {
    expect(parse(`estado=${value}`).state).toBe("vigentes");
  });

  it.each(["activas", "inactivas", "bajas", "todas", "vigentes"])("reads the state %s", (state) => {
    expect(parse(`estado=${state}`).state).toBe(state);
  });

  it("accepts a parent in capitals and drops what is not an id", () => {
    expect(parse(`padre=${PARENT.toUpperCase()}`).parent).toBe(PARENT);
    expect(parse("padre=raiz").parent).toBeUndefined();
  });

  it.each(["0", "-2", "501", "x", "2.5"])("goes to the first page for the page %j", (page) => {
    expect(parse(`pagina=${page}`).page).toBe(1);
  });
});

describe("categoriesHref", () => {
  it("is the bare path for the default query", () => {
    expect(categoriesHref(EMPTY_CATEGORIES_QUERY)).toBe("/admin/categorias");
  });

  it("leaves every default out", () => {
    expect(categoriesHref(query({ state: "vigentes", page: 1 }))).toBe("/admin/categorias");
    expect(categoriesHref(query({ state: "bajas" }))).toBe("/admin/categorias?estado=bajas");
  });

  it("goes back to the first page whenever anything but the page changes", () => {
    const current = query({ q: "libros", page: 4 });

    expect(categoriesHref(current, { state: "bajas" })).toBe(
      "/admin/categorias?q=libros&estado=bajas",
    );
    expect(categoriesHref(current, { page: 5 })).toBe("/admin/categorias?q=libros&pagina=5");
  });

  it("round trips through the address", () => {
    const original = query({ q: "útiles", state: "todas", parent: PARENT, page: 2 });

    const [, search] = categoriesHref(original, { page: 2 }).split("?");

    expect(parse(search)).toEqual(original);
  });
});

describe("filters", () => {
  it("is not filtered by default, nor by the page alone", () => {
    expect(isFiltered(query())).toBe(false);
    expect(isFiltered(query({ page: 3 }))).toBe(false);
  });

  it.each([{ q: "x" }, { state: "bajas" as const }, { parent: PARENT }])(
    "is filtered with %j",
    (overrides) => {
      expect(isFiltered(query(overrides))).toBe(true);
    },
  );

  it("takes away every search and filter and leads to the clean address", () => {
    const filtered = query({ q: "x", state: "bajas", parent: PARENT, page: 3 });

    expect(categoriesHref(filtered, clearedFilters())).toBe("/admin/categorias");
  });

  it("follows the tree only with no search and no location", () => {
    expect(isTreeMode(query())).toBe(true);
    expect(isTreeMode(query({ state: "bajas", page: 2 }))).toBe(true);
    expect(isTreeMode(query({ q: "x" }))).toBe(false);
    expect(isTreeMode(query({ parent: PARENT }))).toBe(false);
  });
});

describe("toApiQuery", () => {
  it("asks for the first page of vigentes, 50 of them, with nothing else", () => {
    expect(toApiQuery(EMPTY_CATEGORIES_QUERY)).toEqual({
      q: undefined,
      status: undefined,
      parentId: undefined,
      page: 1,
      limit: 50,
    });
  });

  it.each([
    ["activas", "ACTIVE"],
    ["inactivas", "INACTIVE"],
    ["bajas", "DELETED"],
    ["todas", "ALL"],
  ] as const)("maps the state %s to %s", (state, status) => {
    expect(toApiQuery(query({ state })).status).toBe(status);
  });

  it("sends the search, the parent and the page as the API names them", () => {
    expect(toApiQuery(query({ q: "libros", parent: PARENT, page: 4 }))).toMatchObject({
      q: "libros",
      parentId: PARENT,
      page: 4,
    });
  });
});
