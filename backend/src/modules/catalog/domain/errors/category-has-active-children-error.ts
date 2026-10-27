import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** Some subcategory, active or not, is still current; `count` says how many. */
export class CategoryHasActiveChildrenError extends BusinessRuleViolationError {
  constructor(count: number) {
    super(
      "CATEGORY_HAS_ACTIVE_CHILDREN",
      "La categoría tiene subcategorías. Dalas de baja o movelas a otra categoría primero.",
      { details: { count } },
    );
  }
}
