import { describe, expect, it } from "vitest";

import {
  clearedFilters,
  EMPTY_PRODUCTS_QUERY,
  isFiltered,
  nextSort,
  parseProductsQuery,
  type ProductsQuery,
  productsHref,
  toApiQuery,
} from "./products-query";

const CATEGORY = "3f2b8c1e-5a4d-4e6f-9b0a-1c2d3e4f5a6b";

const parse = (search: string) => parseProductsQuery(new URLSearchParams(search));
const query = (overrides: Partial<ProductsQuery> = {}): ProductsQuery => ({
  ...EMPTY_PRODUCTS_QUERY,
  ...overrides,
});

describe("parseProductsQuery", () => {
  it("gives the default query for an empty address", () => {
    expect(parse("")).toEqual(EMPTY_PRODUCTS_QUERY);
  });

  it("reads every parameter", () => {
    expect(
      parse(
        `q=cuaderno&estado=bajas&categoria=${CATEGORY}&destacados=true&oferta=true&novedad=true&stock=5&orden=precio&dir=desc&pagina=3`,
      ),
    ).toEqual({
      q: "cuaderno",
      state: "bajas",
      category: CATEGORY,
      featured: true,
      onSale: true,
      isNew: true,
      maxStock: 5,
      sort: "precio",
      direction: "desc",
      page: 3,
    });
  });

  it("trims the search and drops it when it is blank or too long", () => {
    expect(parse("q=%20%20lapiz%20").q).toBe("lapiz");
    expect(parse("q=%20%20").q).toBeUndefined();
    expect(parse(`q=${"a".repeat(101)}`).q).toBeUndefined();
    expect(parse(`q=${"a".repeat(100)}`).q).toHaveLength(100);
  });

  it.each(["borrados", "ACTIVOS", ""])("falls back to the default state for %j", (value) => {
    expect(parse(`estado=${value}`).state).toBe("vigentes");
  });

  it("accepts a category in capitals and drops one that is not an id", () => {
    expect(parse(`categoria=${CATEGORY.toUpperCase()}`).category).toBe(CATEGORY);
    expect(parse("categoria=libros").category).toBeUndefined();
  });

  it.each(["-1", "1.5", "abc", "99999999999", ""])("drops the stock %j", (value) => {
    expect(parse(`stock=${value}`).maxStock).toBeUndefined();
  });

  it("keeps a stock of zero", () => {
    expect(parse("stock=0").maxStock).toBe(0);
  });

  it.each(["0", "-2", "501", "x", "2.5"])("goes to the first page for the page %j", (value) => {
    expect(parse(`pagina=${value}`).page).toBe(1);
  });

  it("accepts the last page the API allows", () => {
    expect(parse("pagina=500").page).toBe(500);
  });

  it("uses the order that fits the column when the direction is missing or invalid", () => {
    expect(parse("").direction).toBe("desc");
    expect(parse("orden=titulo").direction).toBe("asc");
    expect(parse("orden=titulo&dir=sideways").direction).toBe("asc");
    expect(parse("orden=otra").sort).toBe("modificado");
  });

  it("only takes a flag when it is exactly true", () => {
    expect(parse("destacados=1&oferta=si&novedad=TRUE")).toMatchObject({
      featured: false,
      onSale: false,
      isNew: false,
    });
  });
});

describe("productsHref", () => {
  it("is the bare path for the default query", () => {
    expect(productsHref(EMPTY_PRODUCTS_QUERY)).toBe("/admin/productos");
  });

  it("leaves every default out", () => {
    expect(productsHref(query({ sort: "modificado", direction: "desc", page: 1 }))).toBe(
      "/admin/productos",
    );
    expect(productsHref(query({ sort: "titulo", direction: "asc" }))).toBe(
      "/admin/productos?orden=titulo",
    );
  });

  it("writes the direction only when it differs from the column's own", () => {
    expect(productsHref(query({ sort: "precio", direction: "desc" }))).toBe(
      "/admin/productos?orden=precio&dir=desc",
    );
    expect(productsHref(query({ direction: "asc" }))).toBe("/admin/productos?dir=asc");
  });

  it("goes back to the first page whenever anything but the page changes", () => {
    const current = query({ q: "lapiz", page: 4 });

    expect(productsHref(current, { state: "bajas" })).toBe("/admin/productos?q=lapiz&estado=bajas");
    expect(productsHref(current, { page: 5 })).toBe("/admin/productos?q=lapiz&pagina=5");
  });

  it("encodes what was typed", () => {
    expect(productsHref(query({ q: "lápiz & goma" }))).toBe(
      "/admin/productos?q=l%C3%A1piz+%26+goma",
    );
  });

  it("round trips through the address", () => {
    const original = query({
      q: "regla",
      state: "todos",
      category: CATEGORY,
      featured: true,
      onSale: true,
      maxStock: 0,
      sort: "stock",
      direction: "desc",
      page: 2,
    });

    const [, search] = productsHref(original, { page: 2 }).split("?");

    expect(parse(search)).toEqual(original);
  });
});

describe("nextSort", () => {
  it("flips the order of the column it already is sorted by", () => {
    expect(nextSort(query({ sort: "titulo", direction: "asc" }), "titulo")).toEqual({
      sort: "titulo",
      direction: "desc",
    });
    expect(nextSort(query(), "modificado")).toEqual({ sort: "modificado", direction: "asc" });
  });

  it("starts another column in its own order", () => {
    expect(nextSort(query(), "precio")).toEqual({ sort: "precio", direction: "asc" });
    expect(nextSort(query({ sort: "precio", direction: "desc" }), "modificado")).toEqual({
      sort: "modificado",
      direction: "desc",
    });
  });
});

describe("isFiltered", () => {
  it("is false for the default query, whatever the sort and the page", () => {
    expect(isFiltered(query())).toBe(false);
    expect(isFiltered(query({ sort: "precio", direction: "desc", page: 3 }))).toBe(false);
  });

  it.each([
    { q: "x" },
    { state: "bajas" as const },
    { category: CATEGORY },
    { featured: true },
    { onSale: true },
    { isNew: true },
    { maxStock: 0 },
  ])("is true with %j", (overrides) => {
    expect(isFiltered(query(overrides))).toBe(true);
  });
});

describe("toApiQuery", () => {
  it("asks for the first page of vigentes, newest first, with nothing else", () => {
    expect(toApiQuery(EMPTY_PRODUCTS_QUERY)).toEqual({
      q: undefined,
      status: undefined,
      categoryId: undefined,
      isFeatured: undefined,
      isOnSale: undefined,
      isNew: undefined,
      maxStock: undefined,
      sortBy: "UPDATED_AT",
      sortDir: "DESC",
      page: 1,
      limit: 20,
    });
  });

  it.each([
    ["activos", "ACTIVE"],
    ["inactivos", "INACTIVE"],
    ["bajas", "DELETED"],
    ["todos", "ALL"],
  ] as const)("maps the state %s to %s", (state, status) => {
    expect(toApiQuery(query({ state })).status).toBe(status);
  });

  it("sends the filters, the sort and the page as the API names them", () => {
    expect(
      toApiQuery(
        query({
          q: "regla",
          category: CATEGORY,
          featured: true,
          onSale: true,
          isNew: true,
          maxStock: 0,
          sort: "precio",
          direction: "asc",
          page: 4,
        }),
      ),
    ).toMatchObject({
      q: "regla",
      categoryId: CATEGORY,
      isFeatured: true,
      isOnSale: true,
      isNew: true,
      maxStock: 0,
      sortBy: "PRICE",
      sortDir: "ASC",
      page: 4,
    });
  });
});

describe("clearedFilters", () => {
  it("takes away every search and filter and leads to the clean address, keeping the sort", () => {
    const filtered = query({
      q: "regla",
      state: "bajas",
      category: CATEGORY,
      featured: true,
      onSale: true,
      isNew: true,
      maxStock: 3,
      sort: "precio",
      direction: "desc",
      page: 4,
    });

    expect(productsHref(filtered, clearedFilters(filtered))).toBe(
      "/admin/productos?orden=precio&dir=desc",
    );
    expect(productsHref(query(), clearedFilters(query({ q: "x" })))).toBe("/admin/productos");
  });
});
