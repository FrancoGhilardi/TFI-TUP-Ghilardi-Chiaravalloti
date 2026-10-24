import { Logger } from "@nestjs/common";
import { PasswordResetNotifier } from "../../application/ports/password-reset-notifier.js";
import { assignedPasswordMail, type Mail, temporaryPasswordMail } from "./password-mails.js";

/**
 * Writes the mails to the log instead of sending them, temporary password included, so the
 * flows can be tried without a mail provider. The environment never allows it in production.
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
    return this.write(
      to,
      temporaryPasswordMail({ name, temporaryPassword, expiresAt, loginUrl: this.loginUrl }),
    );
  }

  sendAssignedPassword(to: string, name: string, temporaryPassword: string): Promise<void> {
    return this.write(
      to,
      assignedPasswordMail({ name, temporaryPassword, loginUrl: this.loginUrl }),
    );
  }

  private write(to: string, mail: Mail): Promise<void> {
    this.logger.log(
      `Mail not sent, no provider configured. To: ${to}\n${mail.subject}\n${mail.text}`,
    );
    return Promise.resolve();
  }
}
