import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

export class CategoryDeletedError extends BusinessRuleViolationError {
  constructor() {
    super("CATEGORY_DELETED", "La categoría está dada de baja. Reactivala antes de modificarla.");
  }
}
