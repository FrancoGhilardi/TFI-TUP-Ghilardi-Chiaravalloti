import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** A deleted user cannot be changed until it is restored. */
export class DeletedUserError extends BusinessRuleViolationError {
  constructor() {
    super("USER_DELETED", "El usuario está dado de baja. Reactivalo antes de modificarlo.");
  }
}
