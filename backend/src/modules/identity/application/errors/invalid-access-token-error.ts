import { AuthenticationError } from "../../../../shared/domain/errors/index.js";

/** The access token is missing, invalid, expired or belongs to a user who can no longer use it. */
export class InvalidAccessTokenError extends AuthenticationError {
  constructor() {
    super("INVALID_ACCESS_TOKEN", "Tu sesión no es válida o venció. Iniciá sesión de nuevo.");
  }
}
