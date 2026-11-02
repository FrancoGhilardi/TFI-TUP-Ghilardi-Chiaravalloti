import { describe, expect, it } from "vitest";

import { type CategoryNode, rootCategories } from "./category";

const node = (slug: string, children: CategoryNode[] = []): CategoryNode => ({
  id: slug,
  name: slug,
  slug,
  description: null,
  children,
});

const tree = [node("libros", [node("infantiles")]), node("escolar"), node("arte"), node("regalos")];

describe("rootCategories", () => {
  it("keeps the first level in order", () => {
    expect(rootCategories(tree).map(({ slug }) => slug)).toEqual([
      "libros",
      "escolar",
      "arte",
      "regalos",
    ]);
  });

  it("drops the subtrees", () => {
    expect(rootCategories(tree).every(({ children }) => children.length === 0)).toBe(true);
    expect(tree[0].children).toHaveLength(1);
  });

  it("returns an empty list for an empty tree", () => {
    expect(rootCategories([])).toEqual([]);
  });
});
