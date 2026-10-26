import type { Clock } from "../../../../shared/application/clock.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { User } from "../../domain/entities/user.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import type { Email } from "../../domain/value-objects/email.js";
import { TemporaryPassword } from "../../domain/value-objects/temporary-password.js";
import type { AuthSettings } from "../auth-settings.js";
import type { RequestPasswordResetCommand } from "../dto/request-password-reset.command.js";
import { MailDeliveryError } from "../errors/mail-delivery-error.js";
import { parseEmail } from "../parse-email.js";
import type { PasswordResetNotifier } from "../ports/password-reset-notifier.js";
import type { TemporaryPasswordFactory } from "../services/temporary-password-factory.js";

/**
 * Forgot password: mails a temporary password that works alongside the current one until it
 * is used or expires. It never fails for the email, so callers cannot learn which accounts
 * exist; an unknown, disabled or recently served account is simply left alone.
 */
export class RequestPasswordResetUseCase implements UseCase<RequestPasswordResetCommand, void> {
  constructor(
    private readonly users: UserRepository,
    private readonly temporaryPasswords: TemporaryPasswordFactory,
    private readonly notifier: PasswordResetNotifier,
    private readonly transaction: TransactionManager,
    private readonly clock: Clock,
    private readonly settings: AuthSettings,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<void> {
    const email = parseEmail(command.email);
    const user = email && (await this.users.findByEmail(email));
    // Every request hashes, even when no mail goes out, so the load it puts on the server
    // does not reveal whether the account exists. It runs before the transaction, so no
    // connection or row lock is held while it does.
    const { plain, hash } = await this.temporaryPasswords.create();
    if (!email || !user || !this.canReceive(user, this.clock.now())) {
      return;
    }

    const issued = await this.transaction.run(async () => {
      const locked = await this.users.findByEmail(email);
      const now = this.clock.now();
      // Checked again with the row locked, so two requests at once send a single mail.
      if (!locked || !this.canReceive(locked, now)) {
        return null;
      }
      const temporary = TemporaryPassword.issue(
        hash,
        now,
        this.settings.temporaryPasswordTtlMinutes,
      );
      locked.issueTemporaryPassword(temporary, now);
      await this.users.save(locked);
      return { user: locked, temporary };
    });
    if (!issued) {
      return;
    }

    // Sent after the commit, so no connection or row lock waits on the mail provider.
    try {
      await this.notifier.sendTemporaryPassword(
        issued.user.email.toString(),
        issued.user.name.toString(),
        plain,
        issued.temporary.expiresAt,
      );
    } catch (error) {
      // Only a mail the provider clearly rejected is known not to have arrived. Any other
      // failure keeps the password usable, as the mail may be on its way; the wait before a
      // new request is then the same as after a mail that did arrive.
      if (error instanceof MailDeliveryError && !error.maybeDelivered) {
        await this.withdraw(email, hash, error);
      }
      throw error;
    }
  }

  /**
   * A password nobody received must not stay behind blocking the next request. It is only
   * dropped while it is still the one just issued.
   */
  private async withdraw(email: Email, hash: string, mailError: unknown): Promise<void> {
    try {
      await this.transaction.run(async () => {
        const locked = await this.users.findByEmail(email);
        if (locked?.temporaryPassword?.hash !== hash) {
          return;
        }
        locked.discardTemporaryPassword(this.clock.now());
        await this.users.save(locked);
      });
    } catch (error) {
      // Both failures are kept, so the log shows what the provider said too.
      throw new AggregateError(
        [mailError, error],
        "The temporary password mail failed and the password could not be withdrawn",
        { cause: error },
      );
    }
  }

  private canReceive(user: User, now: Date): boolean {
    const pending = user.temporaryPassword;
    const waiting = pending?.isInCooldown(
      now,
      this.settings.temporaryPasswordTtlMinutes,
      this.settings.passwordResetCooldownMinutes,
    );
    return user.canLogin() && !waiting;
  }
}
