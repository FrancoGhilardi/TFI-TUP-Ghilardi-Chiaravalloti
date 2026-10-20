import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** There is no temporary password to use, or it expired. */
export class TemporaryPasswordUnavailableError extends BusinessRuleViolationError {
  constructor() {
    super("TEMPORARY_PASSWORD_UNAVAILABLE", "La clave temporal venció o ya fue usada.");
  }
}
