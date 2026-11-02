import { InvalidValueError } from "../../../../shared/domain/errors/index.js";

export class InvalidDescriptionError extends InvalidValueError {
  constructor(maxLength: number) {
    super("INVALID_DESCRIPTION", `La descripción no puede tener más de ${maxLength} caracteres.`);
  }
}
