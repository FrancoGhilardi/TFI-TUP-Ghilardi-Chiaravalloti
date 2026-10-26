import { InvalidValueError } from "../../../../shared/domain/errors/index.js";
import { CATEGORY_NAME_MAX_LENGTH } from "../catalog-limits.js";

export class InvalidCategoryNameError extends InvalidValueError {
  constructor() {
    super(
      "INVALID_CATEGORY_NAME",
      `El nombre de la categoría no puede estar vacío ni tener más de ${CATEGORY_NAME_MAX_LENGTH} caracteres.`,
    );
  }
}
