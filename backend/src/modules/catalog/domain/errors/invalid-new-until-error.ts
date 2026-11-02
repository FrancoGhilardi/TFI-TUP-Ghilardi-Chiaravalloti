import { InvalidValueError } from "../../../../shared/domain/errors/index.js";

export class InvalidNewUntilError extends InvalidValueError {
  constructor() {
    super("INVALID_NEW_UNTIL", "El vencimiento de la novedad tiene que ser una fecha futura.");
  }
}
