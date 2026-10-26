import { InvalidValueError } from "../../../../shared/domain/errors/index.js";

export class InvalidSaleEndError extends InvalidValueError {
  constructor() {
    super("INVALID_SALE_END", "El vencimiento de la oferta tiene que ser una fecha futura.");
  }
}
