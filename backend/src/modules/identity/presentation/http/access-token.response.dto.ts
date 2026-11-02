import type { AuthSessionResult } from "../../application/dto/auth-session.result.js";
import { AuthenticatedUserResponseDto } from "./authenticated-user.response.dto.js";

/** Body of a new session. The refresh token never goes here: it only travels in the cookie. */
export class AccessTokenResponseDto {
  /** Sent as `Authorization: Bearer`; kept in memory only. */
  readonly accessToken: string;
  /** Seconds until the access token expires. */
  readonly expiresIn: number;
  readonly user: AuthenticatedUserResponseDto;

  private constructor(session: AuthSessionResult) {
    this.accessToken = session.accessToken;
    this.expiresIn = session.accessTokenExpiresIn;
    this.user = AuthenticatedUserResponseDto.from(session.user);
  }

  static from(session: AuthSessionResult): AccessTokenResponseDto {
    return new AccessTokenResponseDto(session);
  }
}
