import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** An admin tried to change their own role, deactivate or delete themselves. */
export class SelfAdministrationError extends BusinessRuleViolationError {
  constructor() {
    super("SELF_ADMINISTRATION", "No podés cambiar tu propio rol, desactivarte ni darte de baja.");
  }
}
