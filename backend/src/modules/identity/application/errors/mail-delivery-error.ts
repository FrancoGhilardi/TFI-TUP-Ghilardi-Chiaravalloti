import { ExternalServiceError } from "../../../../shared/domain/errors/index.js";

/**
 * The mail provider did not confirm the message; the failure it reported is the `cause`.
 * `maybeDelivered` is set when the outcome is unknown (no answer, a dropped connection or a
 * provider error), since the mail may have gone out all the same; it is clear only when the
 * provider rejected the message.
 */
export class MailDeliveryError extends ExternalServiceError {
  constructor(
    cause: unknown,
    readonly maybeDelivered: boolean,
  ) {
    super("MAIL_DELIVERY_FAILED", "No se pudo enviar el mail. Probá de nuevo.", { cause });
  }
}
