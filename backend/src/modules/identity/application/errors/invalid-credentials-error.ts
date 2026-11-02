import { AuthenticationError } from "../../../../shared/domain/errors/index.js";

/**
 * The login failed. The same error covers an unknown email, a wrong or expired password and
 * a user who cannot log in, so the response never reveals which accounts exist.
 */
export class InvalidCredentialsError extends AuthenticationError {
  constructor() {
    super("INVALID_CREDENTIALS", "El email o la contraseña no son correctos.");
  }
}
