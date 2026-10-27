import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** Some related product does not exist or is deleted. */
export class RelatedProductUnavailableError extends BusinessRuleViolationError {
  constructor() {
    super(
      "RELATED_PRODUCT_UNAVAILABLE",
      "Alguno de los productos similares elegidos no existe o fue dado de baja.",
    );
  }
}
