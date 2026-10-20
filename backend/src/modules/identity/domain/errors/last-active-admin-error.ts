import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** The change would leave the system without an active admin. */
export class LastActiveAdminError extends BusinessRuleViolationError {
  constructor() {
    super("LAST_ACTIVE_ADMIN", "Tiene que quedar al menos un administrador activo.");
  }
}
