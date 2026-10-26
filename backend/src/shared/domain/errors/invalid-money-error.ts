import { InvalidValueError } from "./invalid-value-error.js";

export class InvalidMoneyError extends InvalidValueError {
  constructor() {
    super(
      "INVALID_MONEY",
      "El importe tiene que ser un número de hasta 10 cifras enteras y 2 decimales.",
    );
  }
}
