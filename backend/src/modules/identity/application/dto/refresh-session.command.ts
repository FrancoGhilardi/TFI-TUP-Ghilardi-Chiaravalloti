export interface RefreshSessionCommand {
  /** The refresh token from the cookie; missing when the request carried none. */
  refreshToken?: string;
  userAgent?: string;
}
