import { InvalidValueError } from "../../../../shared/domain/errors/index.js";

/** A store listing asked for a highest price below the lowest one; names the field to mark. */
export class InvalidPriceRangeError extends InvalidValueError {
  constructor() {
    super("INVALID_PRICE_RANGE", "El precio máximo no puede ser menor que el mínimo.", {
      details: { field: "maxPrice" },
    });
  }
}
