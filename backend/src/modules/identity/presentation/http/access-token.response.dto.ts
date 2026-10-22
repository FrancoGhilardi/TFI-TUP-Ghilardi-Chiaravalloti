import type { AuthenticatedUserResult } from "../../application/dto/authenticated-user.result.js";
import type { AuthSessionResult } from "../../application/dto/auth-session.result.js";

/** Body of a new session. The refresh token never goes here: it only travels in the cookie. */
export class AccessTokenResponseDto {
  private constructor(
    readonly accessToken: string,
    readonly expiresIn: number,
    readonly user: AuthenticatedUserResult,
  ) {}

  static from(session: AuthSessionResult): AccessTokenResponseDto {
    return new AccessTokenResponseDto(
      session.accessToken,
      session.accessTokenExpiresIn,
      session.user,
    );
  }
}
