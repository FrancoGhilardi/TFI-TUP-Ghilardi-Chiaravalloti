import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** The new password is the same as the current one. */
export class PasswordUnchangedError extends BusinessRuleViolationError {
  constructor() {
    super("PASSWORD_UNCHANGED", "La nueva contraseña tiene que ser distinta de la actual.");
  }
}
