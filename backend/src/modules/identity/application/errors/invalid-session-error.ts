import { AuthenticationError } from "../../../../shared/domain/errors/index.js";

/**
 * The session could not be renewed. The same error covers a missing, unknown, expired,
 * revoked or reused refresh token and a user who can no longer log in, so the response never
 * reveals which one it was.
 */
export class InvalidSessionError extends AuthenticationError {
  constructor() {
    super("INVALID_SESSION", "Tu sesión terminó. Iniciá sesión de nuevo.");
  }
}
