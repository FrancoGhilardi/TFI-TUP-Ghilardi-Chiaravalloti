import { describe, expect, it } from "vitest";

import type { CategoryOption } from "./category-option";
import { descendantIdsOf, hiddenIds, idsWithChildren, selectableParents } from "./category-tree";

const option = (id: string, depth: number, isActive = true): CategoryOption => ({
  id,
  name: id,
  depth,
  isActive,
  label: `${" ".repeat(depth)}${id}`,
});

/**
 * A
 * ├ A1
 * │ ├ A1a
 * │ └ A1b
 * └ A2
 * B
 * └ B1
 * C
 */
const TREE: CategoryOption[] = [
  option("A", 0),
  option("A1", 1),
  option("A1a", 2),
  option("A1b", 2),
  option("A2", 1),
  option("B", 0),
  option("B1", 1),
  option("C", 0),
];

const ids = (options: CategoryOption[]) => options.map(({ id }) => id);

describe("descendantIdsOf", () => {
  it("gives everything below a root, at any depth, and stops at the next root", () => {
    expect(descendantIdsOf(TREE, "A")).toEqual(["A1", "A1a", "A1b", "A2"]);
  });

  it("gives what is below a middle category and stops at its next sibling", () => {
    expect(descendantIdsOf(TREE, "A1")).toEqual(["A1a", "A1b"]);
  });

  it("gives nothing for a leaf, whether it is followed by a sibling, a root or nothing", () => {
    expect(descendantIdsOf(TREE, "A1a")).toEqual([]);
    expect(descendantIdsOf(TREE, "A2")).toEqual([]);
    expect(descendantIdsOf(TREE, "C")).toEqual([]);
  });

  it("does not take the next subtree for a descendant", () => {
    expect(descendantIdsOf(TREE, "B")).toEqual(["B1"]);
  });

  it("gives nothing for a category that is not on the list", () => {
    expect(descendantIdsOf(TREE, "Z")).toEqual([]);
  });
});

describe("selectableParents", () => {
  it("offers every category when creating one", () => {
    expect(ids(selectableParents(TREE))).toEqual(ids(TREE));
  });

  it("leaves out a root and its whole subtree, however many branches it has", () => {
    expect(ids(selectableParents(TREE, "A"))).toEqual(["B", "B1", "C"]);
  });

  it("leaves out a middle category and what is below it, keeping its ancestors and siblings", () => {
    expect(ids(selectableParents(TREE, "A1"))).toEqual(["A", "A2", "B", "B1", "C"]);
  });

  it("leaves out only itself for a leaf", () => {
    expect(ids(selectableParents(TREE, "A1a"))).toEqual(["A", "A1", "A1b", "A2", "B", "B1", "C"]);
  });

  it("never offers a category any of whose ancestors is the one being edited", () => {
    for (const editing of TREE) {
      const below = new Set(descendantIdsOf(TREE, editing.id));
      const offered = ids(selectableParents(TREE, editing.id));

      expect(offered).not.toContain(editing.id);
      for (const id of below) {
        expect(offered).not.toContain(id);
      }
      expect(offered).toHaveLength(TREE.length - 1 - below.size);
    }
  });

  it("keeps the order of the tree and does not change the list it was given", () => {
    const before = ids(TREE);

    selectableParents(TREE, "B");

    expect(ids(TREE)).toEqual(before);
  });

  it("offers everything for an id that is not on the list", () => {
    expect(ids(selectableParents(TREE, "Z"))).toEqual(ids(TREE));
  });
});

describe("hiddenIds", () => {
  it("hides the whole subtree of an inactive root, and not the root itself", () => {
    const tree = [option("A", 0, false), option("A1", 1), option("A1a", 2), option("B", 0)];

    expect([...hiddenIds(tree)]).toEqual(["A1", "A1a"]);
  });

  it("hides what is below an inactive middle category, not its siblings nor its parent", () => {
    const tree = [
      option("A", 0),
      option("A1", 1, false),
      option("A1a", 2),
      option("A2", 1),
      option("A2a", 2),
    ];

    expect([...hiddenIds(tree)]).toEqual(["A1a"]);
  });

  it("hides nothing for an inactive leaf", () => {
    expect([...hiddenIds([option("A", 0), option("A1", 1, false), option("B", 0)])]).toEqual([]);
  });

  it("does not carry an inactive branch over to the next one", () => {
    const tree = [
      option("A", 0, false),
      option("A1", 1),
      option("B", 0),
      option("B1", 1),
      option("B1a", 2),
    ];

    expect([...hiddenIds(tree)]).toEqual(["A1"]);
  });

  it("hides nothing when everything is active", () => {
    expect(hiddenIds(TREE).size).toBe(0);
  });
});

describe("idsWithChildren", () => {
  it("lists the categories that are followed by something deeper", () => {
    expect([...idsWithChildren(TREE)]).toEqual(["A", "A1", "B"]);
  });

  it("has none for a flat list", () => {
    expect(idsWithChildren([option("A", 0), option("B", 0)]).size).toBe(0);
  });
});
