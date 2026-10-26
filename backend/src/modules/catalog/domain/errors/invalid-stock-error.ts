import { InvalidValueError } from "../../../../shared/domain/errors/index.js";

export class InvalidStockError extends InvalidValueError {
  constructor() {
    super("INVALID_STOCK", "El stock tiene que ser un número entero desde 0.");
  }
}
