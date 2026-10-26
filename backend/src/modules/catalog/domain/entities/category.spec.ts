import { InvalidSlugError } from "../../../../shared/domain/errors/invalid-slug-error.js";
import { Slug } from "../../../../shared/domain/value-objects/slug.js";
import { CategoryCycleError } from "../errors/category-cycle-error.js";
import { CategoryDeletedError } from "../errors/category-deleted-error.js";
import { CategoryNotDeletedError } from "../errors/category-not-deleted-error.js";
import { InvalidCategoryNameError } from "../errors/invalid-category-name-error.js";
import { InvalidDescriptionError } from "../errors/invalid-description-error.js";
import { InvalidSortOrderError } from "../errors/invalid-sort-order-error.js";
import { ParentCategoryUnavailableError } from "../errors/parent-category-unavailable-error.js";
import { Category, type NewCategoryProps } from "./category.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");

const create = (overrides: Partial<NewCategoryProps> = {}) =>
  Category.create({
    id: "cat-1",
    name: "Cuadernos",
    slug: Slug.fromText("Cuadernos"),
    now: NOW,
    ...overrides,
  });

const deleted = () => {
  const category = create({ parentId: "parent-1" });
  category.softDelete(NOW);
  return category;
};

describe("Category", () => {
  describe("create", () => {
    it("starts active and visible, at the root, first in the order", () => {
      const category = create();

      expect(category).toMatchObject({
        name: "Cuadernos",
        parentId: undefined,
        description: undefined,
        sortOrder: 0,
        active: true,
        createdAt: NOW,
        updatedAt: NOW,
        deletedAt: undefined,
      });
      expect(category.slug.toString()).toBe("cuadernos");
      expect(category.isVisible()).toBe(true);
    });

    it("trims the name and description, and keeps the parent and order", () => {
      const category = create({
        name: "  Cuadernos  ",
        description: "  Rayados y lisos  ",
        parentId: "parent-1",
        sortOrder: 3,
      });

      expect(category).toMatchObject({
        name: "Cuadernos",
        description: "Rayados y lisos",
        parentId: "parent-1",
        sortOrder: 3,
      });
    });

    it("takes a blank description as none", () => {
      expect(create({ description: "   " }).description).toBeUndefined();
    });

    it.each(["", "   ", "a".repeat(101)])("rejects the name %o", (name) => {
      expect(() => create({ name })).toThrow(InvalidCategoryNameError);
    });

    it("accepts a name of exactly 100 characters, counted in code points", () => {
      expect(create({ name: "ñ".repeat(100) }).name).toHaveLength(100);
    });

    it("rejects a description over 2000 characters", () => {
      expect(() => create({ description: "a".repeat(2001) })).toThrow(InvalidDescriptionError);
    });

    it.each([-1, 1.5])("rejects the order %d", (sortOrder) => {
      expect(() => create({ sortOrder })).toThrow(InvalidSortOrderError);
    });

    it("rejects a slug longer than its column of 120", () => {
      expect(() => create({ slug: Slug.fromText("a".repeat(121)) })).toThrow(InvalidSlugError);
      expect(create({ slug: Slug.fromText("a".repeat(120)) }).slug.length).toBe(120);
    });

    it.each([2_147_483_648, Number.MAX_SAFE_INTEGER])(
      "rejects the order %d, past the column",
      (sortOrder) => {
        expect(() => create({ sortOrder })).toThrow(InvalidSortOrderError);
      },
    );

    it("cannot be its own parent", () => {
      expect(() => create({ parentId: "cat-1" })).toThrow(CategoryCycleError);
    });
  });

  describe("edits", () => {
    it("renames, describes and reorders", () => {
      const category = create();

      category.rename(" Libretas ");
      category.describe("Tapa dura");
      category.changeSortOrder(2);

      expect(category).toMatchObject({ name: "Libretas", description: "Tapa dura", sortOrder: 2 });
      expect(category.slug.toString()).toBe("cuadernos");
    });

    it("clears the description when none is given", () => {
      const category = create({ description: "Algo" });

      category.describe(undefined);

      expect(category.description).toBeUndefined();
    });

    it("activates and deactivates, any number of times", () => {
      const category = create();

      category.deactivate();
      category.deactivate();
      expect(category.isVisible()).toBe(false);
      category.activate();
      expect(category.isVisible()).toBe(true);
    });
  });

  describe("moveTo", () => {
    it("moves under another category", () => {
      const category = create();

      category.moveTo("parent-2", ["grandparent-1"]);

      expect(category.parentId).toBe("parent-2");
    });

    it.each([
      ["itself", "cat-1", []],
      ["one of its subcategories", "child-1", ["cat-1", "root-1"]],
    ])("refuses to move under %s", (_label, parentId, ancestors) => {
      const category = create({ parentId: "root-1" });

      expect(() => category.moveTo(parentId, ancestors)).toThrow(CategoryCycleError);
      expect(category.parentId).toBe("root-1");
    });

    it("moves to the root", () => {
      const category = create({ parentId: "parent-1" });

      category.moveToRoot();

      expect(category.parentId).toBeUndefined();
    });
  });

  describe("deletion", () => {
    it("records the date and keeps the active state", () => {
      const category = create();
      category.deactivate();

      category.softDelete(NOW);

      expect(category.deletedAt).toBe(NOW);
      expect(category.active).toBe(false);
      expect(category.isVisible()).toBe(false);
    });

    it("keeps the first date when deleted again", () => {
      const category = create();
      category.softDelete(NOW);

      category.softDelete(new Date("2026-10-23T00:00:00.000Z"));

      expect(category.deletedAt).toBe(NOW);
    });

    it.each([
      ["rename", (c: Category) => c.rename("Otra")],
      ["describe", (c: Category) => c.describe("Otra")],
      ["move", (c: Category) => c.moveTo("parent-2", [])],
      ["reorder", (c: Category) => c.changeSortOrder(1)],
      ["activate", (c: Category) => c.activate()],
      ["deactivate", (c: Category) => c.deactivate()],
    ])("cannot %s a deleted category", (_label, change) => {
      expect(() => change(deleted())).toThrow(CategoryDeletedError);
    });

    it("can move a deleted category to the root, so it can be restored", () => {
      const category = deleted();

      category.moveToRoot();

      expect(category.parentId).toBeUndefined();
    });
  });

  describe("restore", () => {
    it("clears the deletion, bringing back the state it had", () => {
      const category = create({ parentId: "parent-1" });
      category.deactivate();
      category.softDelete(NOW);

      category.restore(true);

      expect(category.isDeleted()).toBe(false);
      expect(category.active).toBe(false);
    });

    it("refuses while the parent is deleted", () => {
      const category = deleted();

      expect(() => category.restore(false)).toThrow(ParentCategoryUnavailableError);
      expect(category.isDeleted()).toBe(true);
    });

    it("restores a root category whatever the parent flag says", () => {
      const category = deleted();
      category.moveToRoot();

      category.restore(false);

      expect(category.isDeleted()).toBe(false);
    });

    it("refuses a category that is not deleted", () => {
      expect(() => create().restore(true)).toThrow(CategoryNotDeletedError);
    });
  });

  it("rebuilds a stored category as it was", () => {
    const category = Category.reconstitute({
      id: "cat-9",
      name: "Lápices",
      slug: Slug.fromValue("lapices"),
      sortOrder: 4,
      active: false,
      createdAt: NOW,
      updatedAt: NOW,
      deletedAt: NOW,
    });

    expect(category.getId()).toBe("cat-9");
    expect(category).toMatchObject({ name: "Lápices", sortOrder: 4, active: false });
    expect(category.isDeleted()).toBe(true);
  });
});
