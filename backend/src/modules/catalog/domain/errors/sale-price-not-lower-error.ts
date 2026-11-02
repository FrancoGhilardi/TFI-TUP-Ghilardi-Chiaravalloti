import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** The sale price is zero or not below the regular price. */
export class SalePriceNotLowerError extends BusinessRuleViolationError {
  constructor() {
    super(
      "SALE_PRICE_NOT_LOWER",
      "El precio de oferta tiene que ser mayor a cero y menor al precio.",
    );
  }
}
