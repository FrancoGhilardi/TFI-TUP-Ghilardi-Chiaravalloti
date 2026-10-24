import type { AuthSessionResult } from "../../application/dto/auth-session.result.js";
import { AuthenticatedUserResponseDto } from "./authenticated-user.response.dto.js";

/** Body of a new session. The refresh token never goes here: it only travels in the cookie. */
export class AccessTokenResponseDto {
  private constructor(
    readonly accessToken: string,
    readonly expiresIn: number,
    readonly user: AuthenticatedUserResponseDto,
  ) {}

  static from(session: AuthSessionResult): AccessTokenResponseDto {
    return new AccessTokenResponseDto(
      session.accessToken,
      session.accessTokenExpiresIn,
      AuthenticatedUserResponseDto.from(session.user),
    );
  }
}
