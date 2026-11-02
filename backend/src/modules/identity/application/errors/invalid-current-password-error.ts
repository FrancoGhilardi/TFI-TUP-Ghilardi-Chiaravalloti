import { InvalidValueError } from "../../../../shared/domain/errors/index.js";

/**
 * The current password typed to change it is wrong. It is not a 401: the user is still
 * authenticated, and the frontend must not take it as an expired session.
 */
export class InvalidCurrentPasswordError extends InvalidValueError {
  constructor() {
    super("INVALID_CURRENT_PASSWORD", "La contraseña actual no es correcta.");
  }
}
