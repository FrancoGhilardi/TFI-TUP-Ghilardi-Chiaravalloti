import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

export type SelfAdministrationAction = "changeRole" | "deactivate" | "delete" | "resetPassword";

const MESSAGES: Record<SelfAdministrationAction, string> = {
  changeRole: "No podés cambiar tu propio rol.",
  deactivate: "No podés desactivarte a vos mismo.",
  delete: "No podés darte de baja a vos mismo.",
  resetPassword: "No podés restablecer tu propia contraseña. Usá el cambio de contraseña.",
};

/**
 * An admin tried to act on their own account: change their role, deactivate or delete
 * themselves, or reset their password. Same code for all, with a message for each.
 */
export class SelfAdministrationError extends BusinessRuleViolationError {
  constructor(readonly action: SelfAdministrationAction) {
    super("SELF_ADMINISTRATION", MESSAGES[action]);
  }
}
