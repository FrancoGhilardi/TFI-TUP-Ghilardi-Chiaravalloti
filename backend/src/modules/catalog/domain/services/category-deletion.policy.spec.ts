import { CategoryHasActiveChildrenError } from "../errors/category-has-active-children-error.js";
import { CategoryInUseError } from "../errors/category-in-use-error.js";
import { CategoryDeletionPolicy } from "./category-deletion.policy.js";

describe("CategoryDeletionPolicy", () => {
  const policy = new CategoryDeletionPolicy();

  it("allows deleting a category nothing depends on", () => {
    expect(() => policy.assertCanDelete(0, 0)).not.toThrow();
  });

  it("refuses while it has current subcategories, telling how many", () => {
    expect(() => policy.assertCanDelete(2, 0)).toThrow(
      expect.objectContaining({
        constructor: CategoryHasActiveChildrenError,
        publicDetails: { count: 2 },
      }),
    );
  });

  it("refuses while it is the only category of a product, telling how many", () => {
    expect(() => policy.assertCanDelete(0, 3)).toThrow(
      expect.objectContaining({ constructor: CategoryInUseError, publicDetails: { count: 3 } }),
    );
  });

  it("reports the subcategories first", () => {
    expect(() => policy.assertCanDelete(3, 3)).toThrow(CategoryHasActiveChildrenError);
  });
});
