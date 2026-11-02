import { describe, expect, it } from "vitest";

import { activeFilters } from "./active-filters";
import { EMPTY_CATALOG_QUERY, parseCatalogQuery } from "./catalog-query";
import type { CategoryNode } from "./category";

const tree: CategoryNode[] = [
  {
    id: "c1",
    name: "Libros",
    slug: "libros",
    description: null,
    children: [
      { id: "c2", name: "Infantiles", slug: "infantiles", description: null, children: [] },
    ],
  },
];

describe("activeFilters", () => {
  it("lists nothing without filters", () => {
    expect(activeFilters(EMPTY_CATALOG_QUERY, tree)).toEqual([]);
  });

  it("lists every applied filter in order, each with how to remove it", () => {
    const query = parseCatalogQuery({
      q: "cuento",
      categoria: "infantiles",
      destacados: "true",
      novedades: "true",
      orden: "a-z",
    });

    expect(activeFilters(query, tree)).toEqual([
      { kind: "search", value: "cuento", without: { q: undefined } },
      { kind: "category", value: "Infantiles", without: { category: undefined } },
      { kind: "featured", without: { featured: false } },
      { kind: "newArrivals", without: { newArrivals: false } },
    ]);
  });

  it("shows the slug of a category the tree does not know", () => {
    const [filter] = activeFilters(parseCatalogQuery({ categoria: "juguetes" }), []);

    expect(filter).toMatchObject({ kind: "category", value: "juguetes" });
  });
});
