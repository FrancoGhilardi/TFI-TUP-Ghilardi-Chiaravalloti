import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

export class ProductDeletedError extends BusinessRuleViolationError {
  constructor() {
    super("PRODUCT_DELETED", "El producto está dado de baja. Reactivalo antes de modificarlo.");
  }
}
