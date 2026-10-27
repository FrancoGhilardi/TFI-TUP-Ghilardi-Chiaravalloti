import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** Every category of the product is deleted, so it cannot be restored yet. */
export class ProductWithoutCategoryError extends BusinessRuleViolationError {
  constructor() {
    super(
      "PRODUCT_WITHOUT_CATEGORY",
      "El producto no tiene ninguna categoría vigente. Reactivá alguna de sus categorías antes de reactivarlo.",
    );
  }
}
