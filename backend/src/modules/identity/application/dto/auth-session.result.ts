import type { AuthenticatedUserResult } from "./authenticated-user.result.js";

/** A new session: the access token for the response and the refresh token for the cookie. */
export interface AuthSessionResult {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: AuthenticatedUserResult;
}
