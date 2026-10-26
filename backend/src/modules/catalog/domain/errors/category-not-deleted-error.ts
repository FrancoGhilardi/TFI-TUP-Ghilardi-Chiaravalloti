import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

export class CategoryNotDeletedError extends BusinessRuleViolationError {
  constructor() {
    super("CATEGORY_NOT_DELETED", "La categoría no está dada de baja.");
  }
}
