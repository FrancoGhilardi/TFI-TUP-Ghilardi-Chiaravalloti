import type { Resend } from "resend";
import { MailDeliveryError } from "../../application/errors/mail-delivery-error.js";
import { PasswordResetNotifier } from "../../application/ports/password-reset-notifier.js";
import { assignedPasswordMail, type Mail, temporaryPasswordMail } from "./password-mails.js";

// A provider that never answers would keep the request, and a lock or a pending password,
// waiting forever.
const SEND_TIMEOUT_MS = 10_000;

/** Sends the password mails through Resend, from the verified domain. */
export class ResendPasswordResetNotifier extends PasswordResetNotifier {
  constructor(
    private readonly emails: Pick<Resend["emails"], "send">,
    private readonly from: string,
    private readonly loginUrl: string,
    private readonly timeoutMs = SEND_TIMEOUT_MS,
  ) {
    super();
  }

  sendTemporaryPassword(
    to: string,
    name: string,
    temporaryPassword: string,
    expiresAt: Date,
  ): Promise<void> {
    return this.deliver(
      to,
      temporaryPasswordMail({ name, temporaryPassword, expiresAt, loginUrl: this.loginUrl }),
    );
  }

  sendAssignedPassword(to: string, name: string, temporaryPassword: string): Promise<void> {
    return this.deliver(
      to,
      assignedPasswordMail({ name, temporaryPassword, loginUrl: this.loginUrl }),
    );
  }

  /** Every way the send can fail ends as a `MailDeliveryError` holding what went wrong. */
  private async deliver(to: string, mail: Mail): Promise<void> {
    try {
      const { error } = await this.emails.send(
        { from: this.from, to, ...mail },
        { signal: AbortSignal.timeout(this.timeoutMs) },
      );
      // The client reports most failures in the result instead of throwing.
      if (error) {
        throw new Error(`Resend did not accept the mail: ${error.name}: ${error.message}`);
      }
    } catch (error) {
      throw new MailDeliveryError(error);
    }
  }
}
