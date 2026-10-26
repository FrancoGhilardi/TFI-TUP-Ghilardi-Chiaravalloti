import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** The new parent is the category itself or one of its subcategories. */
export class CategoryCycleError extends BusinessRuleViolationError {
  constructor() {
    super(
      "CATEGORY_CYCLE",
      "Una categoría no puede ubicarse dentro de sí misma ni de una de sus subcategorías.",
    );
  }
}
