import { InvalidValueError } from "../../../../shared/domain/errors/index.js";
import { USER_NAME_MAX_LENGTH } from "../value-objects/user-name-policy.js";

export class InvalidUserNameError extends InvalidValueError {
  constructor() {
    super(
      "INVALID_USER_NAME",
      `El nombre no puede estar vacío ni tener más de ${USER_NAME_MAX_LENGTH} caracteres.`,
    );
  }
}
