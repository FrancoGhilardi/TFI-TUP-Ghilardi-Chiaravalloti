import { InvalidValueError } from "../../../../shared/domain/errors/index.js";

export class InvalidSkuError extends InvalidValueError {
  constructor() {
    super("INVALID_SKU", "El SKU tiene que tener el formato LMS- seguido de al menos 6 dígitos.");
  }
}
