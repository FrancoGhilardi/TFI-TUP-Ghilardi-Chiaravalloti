import { InvalidValueError } from "../../../../shared/domain/errors/index.js";
import { PRODUCT_TITLE_MAX_LENGTH } from "../catalog-limits.js";

export class InvalidProductTitleError extends InvalidValueError {
  constructor() {
    super(
      "INVALID_PRODUCT_TITLE",
      `El título no puede estar vacío ni tener más de ${PRODUCT_TITLE_MAX_LENGTH} caracteres.`,
    );
  }
}
