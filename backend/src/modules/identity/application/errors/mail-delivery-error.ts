import { ExternalServiceError } from "../../../../shared/domain/errors/index.js";

/** The mail provider did not take the message; the failure it reported is the `cause`. */
export class MailDeliveryError extends ExternalServiceError {
  constructor(cause: unknown) {
    super("MAIL_DELIVERY_FAILED", "No se pudo enviar el mail. Probá de nuevo.", { cause });
  }
}
