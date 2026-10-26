import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** Some current product has this category as its only one. */
export class CategoryInUseError extends BusinessRuleViolationError {
  constructor() {
    super(
      "CATEGORY_IN_USE",
      "La categoría es la única de algunos productos. Asignales otra categoría primero.",
    );
  }
}
