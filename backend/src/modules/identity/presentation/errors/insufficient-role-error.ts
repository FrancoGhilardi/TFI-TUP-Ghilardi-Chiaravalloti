import { ForbiddenActionError } from "../../../../shared/domain/errors/index.js";

/** The authenticated user's role is not allowed to call the endpoint. */
export class InsufficientRoleError extends ForbiddenActionError {
  constructor() {
    super("INSUFFICIENT_ROLE", "No tenés permiso para realizar esta acción.");
  }
}
