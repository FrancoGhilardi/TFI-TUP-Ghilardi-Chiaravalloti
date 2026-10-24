import type { Resend } from "resend";
import { PasswordResetNotifier } from "../../application/ports/password-reset-notifier.js";
import { temporaryPasswordMail } from "./temporary-password-mail.js";

// The request runs in the background, but a provider that never answers would keep it, and
// the temporary password, waiting forever.
const SEND_TIMEOUT_MS = 10_000;

/** Sends the temporary password through Resend, from the verified domain. */
export class ResendPasswordResetNotifier extends PasswordResetNotifier {
  constructor(
    private readonly emails: Pick<Resend["emails"], "send">,
    private readonly from: string,
    private readonly loginUrl: string,
    private readonly timeoutMs = SEND_TIMEOUT_MS,
  ) {
    super();
  }

  async sendTemporaryPassword(
    to: string,
    name: string,
    temporaryPassword: string,
    expiresAt: Date,
  ): Promise<void> {
    const mail = temporaryPasswordMail({
      name,
      temporaryPassword,
      expiresAt,
      loginUrl: this.loginUrl,
    });
    // The client reports failures in the result instead of throwing.
    const { error } = await this.emails.send(
      { from: this.from, to, ...mail },
      { signal: AbortSignal.timeout(this.timeoutMs) },
    );
    if (error) {
      throw new Error(`Resend did not accept the mail: ${error.name}: ${error.message}`);
    }
  }
}
