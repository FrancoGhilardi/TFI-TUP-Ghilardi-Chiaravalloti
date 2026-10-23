import { Injectable } from "@nestjs/common";
import type { CookieOptions, Request, Response } from "express";

/**
 * The cookie that keeps the refresh token away from JavaScript. `__Secure-` makes the browser
 * reject it unless it was set over HTTPS (localhost counts as secure), and the path limits it
 * to the authentication endpoints, so no other request carries it.
 */
@Injectable()
export class RefreshTokenCookie {
  static readonly NAME = "__Secure-refresh_token";
  static readonly PATH = "/api/v1/auth";

  // The browser only deletes a cookie set with the same path and attributes, so writing and
  // clearing share them.
  private static readonly OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: RefreshTokenCookie.PATH,
  };

  write(res: Response, token: string, expiresAt: Date): void {
    res.cookie(RefreshTokenCookie.NAME, token, {
      ...RefreshTokenCookie.OPTIONS,
      expires: expiresAt,
    });
  }

  /** The token the request carries, or `undefined` when there is none. */
  read(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[RefreshTokenCookie.NAME];
    return typeof token === "string" && token !== "" ? token : undefined;
  }

  clear(res: Response): void {
    res.clearCookie(RefreshTokenCookie.NAME, RefreshTokenCookie.OPTIONS);
  }
}
