import { describe, expect, it } from "vitest";

import { catalogMetadata } from "./catalog-metadata";
import type { CategoryNode } from "./category";

const node = (slug: string, overrides: Partial<CategoryNode> = {}): CategoryNode => ({
  id: slug,
  name: slug === "cuadernos" ? "Cuadernos" : slug,
  slug,
  description: null,
  children: [],
  ...overrides,
});

const tree = [
  node("escolar", {
    name: "Escolar",
    description: "Todo para la vuelta a clases.",
    children: [node("cuadernos")],
  }),
];

describe("catalogMetadata", () => {
  it("indexes the catalog without parameters, with its own canonical", () => {
    const metadata = catalogMetadata({}, tree);

    expect(metadata.title).toBe("Productos");
    expect(metadata.alternates).toEqual({ canonical: "/productos" });
    expect(metadata.robots).toBeUndefined();
  });

  it("indexes a category, named after it, also a subcategory", () => {
    const parent = catalogMetadata({ categoria: "escolar" }, tree);
    const child = catalogMetadata({ categoria: "cuadernos" }, tree);

    expect(parent.title).toBe("Escolar");
    expect(parent.description).toBe("Todo para la vuelta a clases.");
    expect(parent.alternates).toEqual({ canonical: "/productos?categoria=escolar" });
    expect(parent.robots).toBeUndefined();
    expect(child.title).toBe("Cuadernos");
    expect(child.description).toContain("Productos de Cuadernos");
    expect(child.robots).toBeUndefined();
  });

  it.each([
    ["a search", { q: "lapiz" }],
    ["another order", { orden: "menor-precio" }],
    ["a later page", { pagina: "2" }],
    ["featured products", { destacados: "true" }],
    ["new products", { novedades: "true" }],
  ])("keeps %s out of the index, pointing to the catalog", (_name, raw) => {
    const metadata = catalogMetadata(raw, tree);

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toEqual({ canonical: "/productos" });
  });

  it("points a filtered category to the category and keeps it out of the index", () => {
    const metadata = catalogMetadata({ categoria: "escolar", pagina: "3" }, tree);

    expect(metadata.title).toBe("Escolar");
    expect(metadata.alternates).toEqual({ canonical: "/productos?categoria=escolar" });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("keeps out of the index a category that is not in the tree", () => {
    const metadata = catalogMetadata({ categoria: "cuadernos-x" }, tree);

    expect(metadata.title).toBe("Productos");
    expect(metadata.alternates).toEqual({ canonical: "/productos" });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("does not judge a category when the tree did not load", () => {
    const metadata = catalogMetadata({ categoria: "escolar" }, []);

    expect(metadata.alternates).toEqual({ canonical: "/productos?categoria=escolar" });
    expect(metadata.robots).toBeUndefined();
  });
});
