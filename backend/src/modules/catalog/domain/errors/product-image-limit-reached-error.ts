import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";
import { PRODUCT_IMAGES_MAX } from "../catalog-limits.js";

/** A product already has as many images as it can; one has to go before another comes. */
export class ProductImageLimitReachedError extends BusinessRuleViolationError {
  constructor() {
    super(
      "PRODUCT_IMAGE_LIMIT_REACHED",
      `El producto ya tiene ${PRODUCT_IMAGES_MAX} imágenes. Borrá una para subir otra.`,
    );
  }
}
