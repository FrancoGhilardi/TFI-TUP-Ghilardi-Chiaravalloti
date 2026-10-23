import type { Request, Response } from "express";
import { RefreshTokenCookie } from "./refresh-token-cookie.js";

const ATTRIBUTES = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/api/v1/auth",
};

describe("RefreshTokenCookie", () => {
  const refreshTokenCookie = new RefreshTokenCookie();
  const requestWith = (cookies?: Record<string, unknown>) => ({ cookies }) as unknown as Request;

  it("writes the token in a secure, HttpOnly cookie limited to the auth endpoints", () => {
    const cookie = vi.fn();
    const expiresAt = new Date("2026-10-29T12:00:00.000Z");

    refreshTokenCookie.write({ cookie } as unknown as Response, "refresh-token", expiresAt);

    expect(cookie).toHaveBeenCalledExactlyOnceWith("__Secure-refresh_token", "refresh-token", {
      ...ATTRIBUTES,
      expires: expiresAt,
    });
  });

  it("clears the cookie with the same name and attributes it was written with", () => {
    const clearCookie = vi.fn();

    refreshTokenCookie.clear({ clearCookie } as unknown as Response);

    expect(clearCookie).toHaveBeenCalledExactlyOnceWith("__Secure-refresh_token", ATTRIBUTES);
  });

  describe("read", () => {
    it("returns the token of the cookie", () => {
      const req = requestWith({ "__Secure-refresh_token": "refresh-token", other: "x" });

      expect(refreshTokenCookie.read(req)).toBe("refresh-token");
    });

    it.each([
      ["no cookies were parsed", undefined],
      ["there are no cookies", {}],
      ["only other cookies arrive", { refresh_token: "refresh-token" }],
      ["the cookie is empty", { "__Secure-refresh_token": "" }],
      ["the cookie is not text", { "__Secure-refresh_token": { token: "x" } }],
    ])("returns nothing when %s", (_label, cookies) => {
      expect(refreshTokenCookie.read(requestWith(cookies))).toBeUndefined();
    });
  });
});
