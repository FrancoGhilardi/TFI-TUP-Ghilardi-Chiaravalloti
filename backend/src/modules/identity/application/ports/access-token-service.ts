import type { User } from "../../domain/entities/user.js";

export interface AccessToken {
  token: string;
  expiresInSeconds: number;
}

/** What a verified access token proves about its bearer. */
export interface AccessTokenClaims {
  userId: string;
  issuedAt: Date;
}

/** Issues and verifies the short-lived access token that authenticates each request. */
export abstract class AccessTokenService {
  abstract issue(user: User): AccessToken;

  /** Throws `InvalidAccessTokenError` when the token is expired or cannot be trusted. */
  abstract verify(token: string): AccessTokenClaims;
}
