import { Injectable } from "@nestjs/common";
import type { Response } from "express";

/**
 * The cookie that keeps the refresh token away from JavaScript. `__Secure-` makes the browser
 * reject it unless it was set over HTTPS (localhost counts as secure), and the path limits it
 * to the authentication endpoints, so no other request carries it.
 */
@Injectable()
export class RefreshTokenCookie {
  static readonly NAME = "__Secure-refresh_token";
  static readonly PATH = "/api/v1/auth";

  write(res: Response, token: string, expiresAt: Date): void {
    res.cookie(RefreshTokenCookie.NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: RefreshTokenCookie.PATH,
      expires: expiresAt,
    });
  }
}
