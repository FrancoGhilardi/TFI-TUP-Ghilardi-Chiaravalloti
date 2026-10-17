import type { User } from "../../domain/entities/user.js";

export interface AccessToken {
  token: string;
  expiresInSeconds: number;
}

/** Issues the short-lived access token that authenticates each request. */
export abstract class AccessTokenService {
  abstract issue(user: User): AccessToken;
}
