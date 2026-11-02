import { buildCategoryTree, type CategoryTreeRow } from "./category-tree.js";

const row = (
  id: string,
  parentId: string | null,
  overrides: Partial<CategoryTreeRow> = {},
): CategoryTreeRow => ({
  id,
  parentId,
  name: `Category ${id}`,
  slug: `category-${id}`,
  description: null,
  sortOrder: 0,
  ...overrides,
});

const names = (tree: ReturnType<typeof buildCategoryTree>): unknown =>
  tree.map((node) => (node.children.length ? { [node.name]: names(node.children) } : node.name));

describe("buildCategoryTree", () => {
  it("nests each category under its parent, from the roots", () => {
    const tree = buildCategoryTree([
      row("pens", "writing", { name: "Lapiceras" }),
      row("writing", null, { name: "Escritura" }),
      row("notebooks", null, { name: "Cuadernos", description: "Todos" }),
      row("gel", "pens", { name: "Gel" }),
    ]);

    expect(tree).toEqual([
      {
        id: "notebooks",
        name: "Cuadernos",
        slug: "category-notebooks",
        description: "Todos",
        children: [],
      },
      {
        id: "writing",
        name: "Escritura",
        slug: "category-writing",
        description: null,
        children: [
          {
            id: "pens",
            name: "Lapiceras",
            slug: "category-pens",
            description: null,
            children: [
              { id: "gel", name: "Gel", slug: "category-gel", description: null, children: [] },
            ],
          },
        ],
      },
    ]);
  });

  it("orders each level by sort order, then name ignoring case and accents, then id", () => {
    const tree = buildCategoryTree([
      row("c", null, { name: "Zeta", sortOrder: 0 }),
      row("a", null, { name: "árbol", sortOrder: 1 }),
      row("b", null, { name: "Bloc", sortOrder: 1 }),
      row("e", null, { name: "Bloc", sortOrder: 1 }),
      row("d", null, { name: "Aaa", sortOrder: 2 }),
    ]);

    expect(tree.map((node) => node.id)).toEqual(["c", "a", "b", "e", "d"]);
  });

  it("leaves out a category whose parent is not visible, with all under it", () => {
    const tree = buildCategoryTree([
      row("root", null, { name: "Root" }),
      row("orphan", "hidden-parent", { name: "Orphan" }),
      row("grandchild", "orphan", { name: "Grandchild" }),
    ]);

    expect(names(tree)).toEqual(["Root"]);
  });

  it("leaves out categories caught in a loop, without looping itself", () => {
    const tree = buildCategoryTree([
      row("root", null, { name: "Root" }),
      row("a", "b", { name: "A" }),
      row("b", "a", { name: "B" }),
      row("self", "self", { name: "Self" }),
    ]);

    expect(names(tree)).toEqual(["Root"]);
  });

  it.each(["", "   "])("gives no description for a blank one (%o)", (description) => {
    expect(buildCategoryTree([row("a", null, { description })])[0]?.description).toBeNull();
  });

  it("is empty without categories", () => {
    expect(buildCategoryTree([])).toEqual([]);
  });
});
