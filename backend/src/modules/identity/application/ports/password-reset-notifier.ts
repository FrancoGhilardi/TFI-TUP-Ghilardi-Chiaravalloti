/** Sends a temporary password to its owner. */
export abstract class PasswordResetNotifier {
  /**
   * Forgot password: the temporary password works alongside the current one until it expires.
   * Rejects when the message could not be handed over for delivery.
   */
  abstract sendTemporaryPassword(
    to: string,
    name: string,
    temporaryPassword: string,
    expiresAt: Date,
  ): Promise<void>;

  /**
   * An admin reset the password: the temporary one already replaced it. Rejects when the
   * message could not be handed over for delivery, so the reset can be rolled back.
   */
  abstract sendAssignedPassword(to: string, name: string, temporaryPassword: string): Promise<void>;
}
