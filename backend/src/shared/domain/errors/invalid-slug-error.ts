import { InvalidValueError } from "./invalid-value-error.js";

export type InvalidSlugReason = "empty" | "tooLong" | "format";

const MESSAGES: Record<InvalidSlugReason, string> = {
  empty: "El texto tiene que incluir al menos una letra o un número.",
  tooLong: "El texto es demasiado largo para formar la dirección.",
  format: "La dirección solo puede tener letras minúsculas y números separados por guiones.",
};

/** Same code for every reason, with a message for each. */
export class InvalidSlugError extends InvalidValueError {
  constructor(readonly reason: InvalidSlugReason) {
    super("INVALID_SLUG", MESSAGES[reason]);
  }
}
