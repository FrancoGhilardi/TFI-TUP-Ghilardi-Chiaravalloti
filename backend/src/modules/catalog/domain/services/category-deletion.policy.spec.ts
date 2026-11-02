import { CategoryHasActiveChildrenError } from "../errors/category-has-active-children-error.js";
import { CategoryInUseError } from "../errors/category-in-use-error.js";
import { CategoryDeletionPolicy } from "./category-deletion.policy.js";

describe("CategoryDeletionPolicy", () => {
  const policy = new CategoryDeletionPolicy();

  it("allows deleting a category nothing depends on", () => {
    expect(() => policy.assertCanDelete(0, 0)).not.toThrow();
  });

  it("refuses while it has active subcategories", () => {
    expect(() => policy.assertCanDelete(1, 0)).toThrow(CategoryHasActiveChildrenError);
  });

  it("refuses while it is the only category of a product", () => {
    expect(() => policy.assertCanDelete(0, 2)).toThrow(CategoryInUseError);
  });

  it("reports the subcategories first", () => {
    expect(() => policy.assertCanDelete(3, 3)).toThrow(CategoryHasActiveChildrenError);
  });
});
