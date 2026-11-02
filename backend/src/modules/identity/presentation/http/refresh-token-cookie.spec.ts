import type { Response } from "express";
import { RefreshTokenCookie } from "./refresh-token-cookie.js";

describe("RefreshTokenCookie", () => {
  it("writes the token in a secure, HttpOnly cookie limited to the auth endpoints", () => {
    const cookie = vi.fn();
    const expiresAt = new Date("2026-10-29T12:00:00.000Z");

    new RefreshTokenCookie().write({ cookie } as unknown as Response, "refresh-token", expiresAt);

    expect(cookie).toHaveBeenCalledExactlyOnceWith("__Secure-refresh_token", "refresh-token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/api/v1/auth",
      expires: expiresAt,
    });
  });
});
