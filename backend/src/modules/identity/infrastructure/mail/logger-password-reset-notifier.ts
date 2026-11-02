import { Logger } from "@nestjs/common";
import { PasswordResetNotifier } from "../../application/ports/password-reset-notifier.js";
import { temporaryPasswordMail } from "./temporary-password-mail.js";

/**
 * Writes the mail to the log instead of sending it, temporary password included, so the flow
 * can be tried without a mail provider. The environment never allows it in production.
 */
export class LoggerPasswordResetNotifier extends PasswordResetNotifier {
  private readonly logger = new Logger(PasswordResetNotifier.name);

  constructor(private readonly loginUrl: string) {
    super();
  }

  sendTemporaryPassword(
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
    this.logger.log(`Mail not sent, no provider configured. To: ${to}\n${mail.text}`);
    return Promise.resolve();
  }
}
