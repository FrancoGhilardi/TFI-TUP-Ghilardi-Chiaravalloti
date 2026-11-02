import { CategoryHasActiveChildrenError } from "../errors/category-has-active-children-error.js";
import { CategoryInUseError } from "../errors/category-in-use-error.js";

/**
 * Whether a category can be deleted: not while it has active subcategories, nor while it is
 * the only category of a current product, which would be left without one. The caller passes
 * both counts, so the policy stays free of any repository.
 */
export class CategoryDeletionPolicy {
  assertCanDelete(activeChildren: number, productsWithOnlyThisCategory: number): void {
    if (activeChildren > 0) {
      throw new CategoryHasActiveChildrenError();
    }
    if (productsWithOnlyThisCategory > 0) {
      throw new CategoryInUseError();
    }
  }
}
