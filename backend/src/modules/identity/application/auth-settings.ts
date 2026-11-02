/**
 * Durations of the authentication flows. The values come from the environment; the use cases
 * read them from here so they stay free of any configuration library.
 */
export class AuthSettings {
  constructor(readonly refreshTokenTtlDays: number) {}
}
