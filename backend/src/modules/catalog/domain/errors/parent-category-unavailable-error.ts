import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

export class ParentCategoryUnavailableError extends BusinessRuleViolationError {
  constructor() {
    super(
      "PARENT_CATEGORY_UNAVAILABLE",
      "La categoría padre está dada de baja. Reactivala primero o mové esta categoría a la raíz.",
    );
  }
}
