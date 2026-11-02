import { InvalidValueError } from "../../../../shared/domain/errors/index.js";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../value-objects/password-policy.js";

export type InvalidPasswordReason = "length" | "characters";

const MESSAGES: Record<InvalidPasswordReason, string> = {
  length: `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`,
  characters: "La contraseña tiene caracteres no válidos.",
};

/** Same code for every reason, so the frontend handles a single case. */
export class InvalidPasswordError extends InvalidValueError {
  constructor(readonly reason: InvalidPasswordReason) {
    super("INVALID_PASSWORD", MESSAGES[reason]);
  }
}
