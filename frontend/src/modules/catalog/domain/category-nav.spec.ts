import { describe, expect, it } from "vitest";

import { parseCatalogQuery } from "./catalog-query";
import type { CategoryNode } from "./category";
import { categoryNavItems } from "./category-nav";

const node = (slug: string, children: CategoryNode[] = []): CategoryNode => ({
  id: slug,
  name: slug,
  slug,
  description: null,
  children,
});

const tree = [
  node("escolar", [node("cuadernos", [node("rayados")]), node("mochilas")]),
  node("arte"),
];

describe("categoryNavItems", () => {
  it("links every category at any depth keeping the query and leaves every branch folded", () => {
    const items = categoryNavItems(tree, parseCatalogQuery({ q: "lapiz", orden: "a-z" }));

    expect(items.map((item) => [item.href, item.expanded, item.active])).toEqual([
      ["/productos?q=lapiz&categoria=escolar&orden=a-z", false, false],
      ["/productos?q=lapiz&categoria=arte&orden=a-z", false, false],
    ]);
    expect(items[0].children[0].children[0].href).toBe(
      "/productos?q=lapiz&categoria=rayados&orden=a-z",
    );
  });

  it("opens only the branch down to the selected category and marks it", () => {
    const [escolar] = categoryNavItems(tree, parseCatalogQuery({ categoria: "rayados" }));
    const [cuadernos, mochilas] = escolar.children;

    expect(escolar.expanded).toBe(true);
    expect(cuadernos.expanded).toBe(true);
    expect(mochilas.expanded).toBe(false);
    expect(cuadernos.children[0]).toMatchObject({ active: true, expanded: false });
  });

  it("keeps a selected category with subcategories open to show them", () => {
    const [escolar] = categoryNavItems(tree, parseCatalogQuery({ categoria: "escolar" }));

    expect(escolar).toMatchObject({ active: true, expanded: true });
  });
});
