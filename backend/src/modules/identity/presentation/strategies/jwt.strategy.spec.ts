import type { ConfigService } from "@nestjs/config";
import type { Env } from "../../../../config/env.js";
import type { AuthenticatedUserResult } from "../../application/dto/authenticated-user.result.js";
import { InvalidAccessTokenError } from "../../application/errors/invalid-access-token-error.js";
import type { ResolveAuthenticatedUserUseCase } from "../../application/use-cases/resolve-authenticated-user.use-case.js";
import { UserRole } from "../../domain/user-role.js";
import { JwtStrategy } from "./jwt.strategy.js";

const USER_ID = "4f9c1f43-6f4b-4d5c-9a3e-5b2d8c7a1e10";

const result: AuthenticatedUserResult = {
  id: USER_ID,
  email: "ana@example.com",
  name: "Ana",
  role: UserRole.SELLER,
  mustChangePassword: false,
};

function setup() {
  const execute = vi.fn().mockResolvedValue(result);
  const config = {
    get: () => "a-secret-that-is-long-enough-for-hs256",
  } as unknown as ConfigService<Env, true>;
  const strategy = new JwtStrategy(config, {
    execute,
  } as unknown as ResolveAuthenticatedUserUseCase);
  return { strategy, execute };
}

describe("JwtStrategy", () => {
  it("resolves the user from the token subject and issue time", async () => {
    const { strategy, execute } = setup();

    await expect(strategy.validate({ sub: USER_ID, iat: 1_760_000_000, exp: 1 })).resolves.toEqual(
      result,
    );
    expect(execute).toHaveBeenCalledWith({
      userId: USER_ID,
      tokenIssuedAt: new Date(1_760_000_000 * 1000),
    });
  });

  it.each([
    ["without sub", { iat: 1 }],
    ["with a non-string sub", { sub: 42, iat: 1 }],
    ["with a sub that is not a uuid", { sub: "abc", iat: 1 }],
    ["without iat", { sub: USER_ID }],
    ["with a non-numeric iat", { sub: USER_ID, iat: "1" }],
  ])("rejects a payload %s", async (_label, payload) => {
    const { strategy, execute } = setup();

    await expect(strategy.validate(payload)).rejects.toThrow(InvalidAccessTokenError);
    expect(execute).not.toHaveBeenCalled();
  });

  it("propagates the rejection of the use case", async () => {
    const { strategy, execute } = setup();
    execute.mockRejectedValue(new InvalidAccessTokenError());

    await expect(strategy.validate({ sub: USER_ID, iat: 1 })).rejects.toThrow(
      InvalidAccessTokenError,
    );
  });
});
