import { describe, expect, it } from "vitest";

import {
  canonicalCatalogHref,
  catalogHref,
  catalogParamEntries,
  categoryHref,
  EMPTY_CATALOG_QUERY,
  FEATURED_CATALOG_HREF,
  NEW_ARRIVALS_CATALOG_HREF,
  parseCatalogQuery,
  searchableTerm,
  toApiParams,
} from "./catalog-query";

describe("parseCatalogQuery", () => {
  it("reads every valid parameter", () => {
    expect(
      parseCatalogQuery({
        q: "  lápiz negro ",
        categoria: "arte-y-pintura",
        destacados: "true",
        novedades: "true",
        orden: "menor-precio",
        pagina: "3",
      }),
    ).toEqual({
      q: "lápiz negro",
      category: "arte-y-pintura",
      featured: true,
      newArrivals: true,
      sort: "menor-precio",
      page: 3,
    });
  });

  it("uses the defaults without parameters", () => {
    expect(parseCatalogQuery({})).toEqual(EMPTY_CATALOG_QUERY);
  });

  it.each([
    ["a one-letter search", { q: "a" }, { q: undefined }],
    ["a search over 100 characters", { q: "x".repeat(101) }, { q: undefined }],
    ["a category that cannot be a slug", { categoria: "Arte & Pintura" }, { category: undefined }],
    [
      "a flag other than true",
      { destacados: "si", novedades: "1" },
      { featured: false, newArrivals: false },
    ],
    ["an unknown sort", { orden: "barato" }, { sort: "relevancia" }],
    ["a page that is not a number", { pagina: "abc" }, { page: 1 }],
    ["page zero", { pagina: "0" }, { page: 1 }],
    ["a decimal page", { pagina: "2.5" }, { page: 1 }],
    ["a page beyond what the API serves", { pagina: "501" }, { page: 1 }],
  ])("drops %s", (_name, raw, expected) => {
    expect(parseCatalogQuery(raw)).toMatchObject(expected);
  });

  it("takes the first value of a repeated parameter", () => {
    expect(parseCatalogQuery({ categoria: ["libros", "arte"] }).category).toBe("libros");
  });
});

describe("catalogHref", () => {
  const query = parseCatalogQuery({
    q: "lapiz",
    categoria: "arte",
    destacados: "true",
    orden: "a-z",
    pagina: "4",
  });

  it("keeps the other filters and goes back to the first page on a filter change", () => {
    expect(catalogHref(query, { category: "libros" })).toBe(
      "/productos?q=lapiz&categoria=libros&destacados=true&orden=a-z",
    );
  });

  it("keeps every filter when only the page changes", () => {
    expect(catalogHref(query, { page: 5 })).toBe(
      "/productos?q=lapiz&categoria=arte&destacados=true&orden=a-z&pagina=5",
    );
  });

  it("removes a filter set to its empty value", () => {
    expect(catalogHref(query, { q: undefined, featured: false })).toBe(
      "/productos?categoria=arte&orden=a-z",
    );
  });

  it("leaves defaults out, down to the bare path", () => {
    expect(catalogHref(EMPTY_CATALOG_QUERY)).toBe("/productos");
  });

  it("builds the links other pages use", () => {
    expect(categoryHref("arte-y-pintura")).toBe("/productos?categoria=arte-y-pintura");
    expect(FEATURED_CATALOG_HREF).toBe("/productos?destacados=true");
    expect(NEW_ARRIVALS_CATALOG_HREF).toBe("/productos?novedades=true");
  });
});

describe("catalogParamEntries", () => {
  it("lists the query as URL pairs, leaving the given parameters out", () => {
    const query = parseCatalogQuery({ q: "lapiz", categoria: "arte", orden: "a-z", pagina: "2" });

    expect(catalogParamEntries(query, ["q", "page"])).toEqual([
      ["categoria", "arte"],
      ["orden", "a-z"],
    ]);
  });
});

describe("toApiParams", () => {
  it("maps the query to the API parameters with the page size", () => {
    const query = parseCatalogQuery({
      q: "lapiz",
      categoria: "arte",
      destacados: "true",
      orden: "menor-precio",
      pagina: "2",
    });

    expect(toApiParams(query)).toEqual({
      q: "lapiz",
      categorySlug: "arte",
      isFeatured: true,
      isNew: undefined,
      sort: "PRICE_ASC",
      page: 2,
      limit: 20,
    });
  });

  it("asks for relevance and the first page by default", () => {
    expect(toApiParams(EMPTY_CATALOG_QUERY)).toMatchObject({ sort: "RELEVANCE", page: 1 });
  });
});

describe("category limits", () => {
  it("drops a category slug longer than the API accepts", () => {
    expect(parseCatalogQuery({ categoria: "a".repeat(121) }).category).toBeUndefined();
    expect(parseCatalogQuery({ categoria: "a".repeat(120) }).category).toBe("a".repeat(120));
  });
});

describe("canonicalCatalogHref", () => {
  it("needs nothing for a URL the store wrote", () => {
    expect(canonicalCatalogHref({})).toBeUndefined();
    expect(canonicalCatalogHref({ q: "lapiz", categoria: "arte", pagina: "2" })).toBeUndefined();
  });

  it.each([
    ["an invalid page", { q: "lapiz", pagina: "9999" }, "/productos?q=lapiz"],
    ["a default written out", { orden: "relevancia", pagina: "1" }, "/productos"],
    ["an untrimmed search", { q: " lapiz " }, "/productos?q=lapiz"],
    ["parameters in another order", { pagina: "2", q: "lapiz" }, "/productos?q=lapiz&pagina=2"],
    ["an unknown parameter", { q: "lapiz", ref: "home" }, "/productos?q=lapiz"],
  ])("points %s to the store's URL", (_name, raw, expected) => {
    expect(canonicalCatalogHref(raw)).toBe(expected);
  });
});

describe("searchableTerm", () => {
  it.each([
    [undefined, undefined],
    ["", undefined],
    ["a", undefined],
    ["   a  ", undefined],
    ["ab", "ab"],
    ["  lápiz negro  ", "lápiz negro"],
    ["a".repeat(100), "a".repeat(100)],
    ["a".repeat(101), undefined],
  ])("reads %j as %j", (raw, expected) => {
    expect(searchableTerm(raw)).toBe(expected);
  });
});
