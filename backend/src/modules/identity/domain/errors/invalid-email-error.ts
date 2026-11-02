import { InvalidValueError } from "../../../../shared/domain/errors/index.js";

export class InvalidEmailError extends InvalidValueError {
  constructor() {
    super("INVALID_EMAIL", "El email no tiene un formato válido.");
  }
}
