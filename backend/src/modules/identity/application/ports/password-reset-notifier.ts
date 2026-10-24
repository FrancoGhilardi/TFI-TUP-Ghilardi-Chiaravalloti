/** Sends a temporary password to its owner. */
export abstract class PasswordResetNotifier {
  /** Rejects when the message could not be handed over for delivery. */
  abstract sendTemporaryPassword(
    to: string,
    name: string,
    temporaryPassword: string,
    expiresAt: Date,
  ): Promise<void>;
}
