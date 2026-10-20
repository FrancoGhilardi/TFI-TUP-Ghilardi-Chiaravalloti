import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

/** Only a deleted user can be restored. */
export class UserNotDeletedError extends BusinessRuleViolationError {
  constructor() {
    super("USER_NOT_DELETED", "El usuario no está dado de baja.");
  }
}
