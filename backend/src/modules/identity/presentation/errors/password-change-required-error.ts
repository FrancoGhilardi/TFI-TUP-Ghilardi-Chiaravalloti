import { ForbiddenActionError } from "../../../../shared/domain/errors/index.js";

/** The user must replace the temporary password before using the rest of the API. */
export class PasswordChangeRequiredError extends ForbiddenActionError {
  constructor() {
    super("PASSWORD_CHANGE_REQUIRED", "Tenés que cambiar tu contraseña antes de continuar.");
  }
}
