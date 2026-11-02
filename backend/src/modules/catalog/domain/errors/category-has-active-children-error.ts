import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

export class CategoryHasActiveChildrenError extends BusinessRuleViolationError {
  constructor() {
    super(
      "CATEGORY_HAS_ACTIVE_CHILDREN",
      "La categoría tiene subcategorías activas. Dalas de baja o movelas primero.",
    );
  }
}
