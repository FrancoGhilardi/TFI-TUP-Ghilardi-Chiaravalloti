import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

export class ProductNotDeletedError extends BusinessRuleViolationError {
  constructor() {
    super("PRODUCT_NOT_DELETED", "El producto no está dado de baja.");
  }
}
