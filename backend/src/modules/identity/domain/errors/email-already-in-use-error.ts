import { ConflictError } from "../../../../shared/domain/errors/index.js";

/** Another current user already has the email. */
export class EmailAlreadyInUseError extends ConflictError {
  constructor() {
    super("EMAIL_ALREADY_IN_USE", "Ya existe un usuario con ese email.");
  }
}
