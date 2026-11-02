import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** Some current product has this category as its only one; `count` says how many. */
export class CategoryInUseError extends BusinessRuleViolationError {
  constructor(count: number) {
    super(
      "CATEGORY_IN_USE",
      "La categoría es la única de algunos productos. Asignales otra categoría primero.",
      { details: { count } },
    );
  }
}
