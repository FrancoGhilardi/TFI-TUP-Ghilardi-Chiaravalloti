import type { AuthenticatedUserResult } from "../../application/dto/authenticated-user.result.js";
import { UserRole } from "../../domain/user-role.js";
import { AuthenticatedUserResponseDto } from "./authenticated-user.response.dto.js";

const USER: AuthenticatedUserResult = {
  id: "user-1",
  email: "ana@example.com",
  name: "Ana",
  role: UserRole.SELLER,
  mustChangePassword: true,
};

describe("AuthenticatedUserResponseDto", () => {
  it("has the user, its role and whether it must change its password", () => {
    expect(JSON.parse(JSON.stringify(AuthenticatedUserResponseDto.from(USER)))).toEqual(USER);
  });

  it("leaves out anything else the user carries", () => {
    const withMore = { ...USER, passwordHash: "secret-hash" } as AuthenticatedUserResult;

    expect(Object.keys(AuthenticatedUserResponseDto.from(withMore)).sort()).toEqual([
      "email",
      "id",
      "mustChangePassword",
      "name",
      "role",
    ]);
  });
});
