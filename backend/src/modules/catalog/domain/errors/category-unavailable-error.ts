import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** Some category given to a product does not exist, is inactive or is deleted. */
export class CategoryUnavailableError extends BusinessRuleViolationError {
  constructor() {
    super(
      "CATEGORY_UNAVAILABLE",
      "Alguna de las categorías elegidas no existe, está inactiva o fue dada de baja.",
    );
  }
}
