import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** The parent does not exist or is deleted. */
export class ParentCategoryUnavailableError extends BusinessRuleViolationError {
  constructor() {
    super("PARENT_CATEGORY_UNAVAILABLE", "La categoría padre no existe o está dada de baja.");
  }
}
