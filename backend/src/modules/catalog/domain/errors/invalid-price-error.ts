import { InvalidValueError } from "../../../../shared/domain/errors/index.js";

export class InvalidPriceError extends InvalidValueError {
  constructor() {
    super("INVALID_PRICE", "El precio tiene que ser mayor a cero.");
  }
}
