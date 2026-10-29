import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** A product always keeps one image; another one has to come before this one goes. */
export class LastProductImageError extends BusinessRuleViolationError {
  constructor() {
    super(
      "LAST_PRODUCT_IMAGE",
      "El producto tiene que tener al menos una imagen. Subí otra antes de borrar esta.",
    );
  }
}
