import { UserRole } from "../../domain/user-role.js";
import { AccessTokenResponseDto } from "./access-token.response.dto.js";

describe("AccessTokenResponseDto", () => {
  it("exposes the access token and the user, never the refresh token", () => {
    const user = {
      id: "user-1",
      email: "ana@example.com",
      name: "Ana",
      role: UserRole.SELLER,
      mustChangePassword: false,
    };

    const body = AccessTokenResponseDto.from({
      accessToken: "access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token",
      refreshTokenExpiresAt: new Date("2026-10-29T12:00:00.000Z"),
      user,
    });

    expect(JSON.parse(JSON.stringify(body))).toEqual({
      accessToken: "access-token",
      expiresIn: 900,
      user,
    });
  });
});
