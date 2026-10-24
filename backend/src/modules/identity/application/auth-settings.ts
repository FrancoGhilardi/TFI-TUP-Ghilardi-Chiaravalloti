/**
 * Durations of the authentication flows. The values come from the environment; the use cases
 * read them from here so they stay free of any configuration library.
 */
export class AuthSettings {
  /** How long a temporary password from the forgot flow works. */
  readonly temporaryPasswordTtlMinutes = 30;
  /** How long a new forgot-password request waits after the last one. */
  readonly passwordResetCooldownMinutes = 5;

  constructor(readonly refreshTokenTtlDays: number) {}
}
