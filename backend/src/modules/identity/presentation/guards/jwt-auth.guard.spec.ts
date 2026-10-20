import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InvalidAccessTokenError } from "../../application/errors/invalid-access-token-error.js";
import type { AccessTokenService } from "../../application/ports/access-token-service.js";
import type { ResolveAuthenticatedUserUseCase } from "../../application/use-cases/resolve-authenticated-user.use-case.js";
import { UserRole } from "../../domain/user-role.js";
import type { AuthUser } from "../auth-user.js";
import { Public } from "../decorators/public.decorator.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

class MixedController {
  @Public()
  open() {}

  closed() {}
}

@Public()
class PublicController {
  anything() {}
}

const USER_ID = "4f9c1f43-6f4b-4d5c-9a3e-5b2d8c7a1e10";
const ISSUED_AT = new Date("2026-10-20T12:00:00.000Z");
const user: AuthUser = {
  id: USER_ID,
  email: "ana@example.com",
  name: "Ana",
  role: UserRole.ADMIN,
  mustChangePassword: false,
};

function setup() {
  const verify = vi.fn().mockReturnValue({ userId: USER_ID, issuedAt: ISSUED_AT });
  const execute = vi.fn().mockResolvedValue(user);
  const guard = new JwtAuthGuard(
    new Reflector(),
    { verify } as unknown as AccessTokenService,
    { execute } as unknown as ResolveAuthenticatedUserUseCase,
  );

  const run = async (
    authorization?: string,
    controller: new () => object = MixedController,
    handler = "closed",
  ) => {
    const request: { headers: Record<string, string>; user?: AuthUser } = {
      headers: authorization === undefined ? {} : { authorization },
    };
    const context = {
      getHandler: () => (controller.prototype as Record<string, unknown>)[handler],
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const allowed = await guard.canActivate(context);
    return { allowed, request };
  };

  return { run, verify, execute };
}

describe("JwtAuthGuard", () => {
  it("lets a public handler through without reading the token", async () => {
    const { run, verify } = setup();

    await expect(run(undefined, MixedController, "open")).resolves.toMatchObject({
      allowed: true,
    });
    expect(verify).not.toHaveBeenCalled();
  });

  it("lets every handler of a public controller through without reading the token", async () => {
    const { run, verify } = setup();

    await expect(run(undefined, PublicController, "anything")).resolves.toMatchObject({
      allowed: true,
    });
    expect(verify).not.toHaveBeenCalled();
  });

  it("verifies the Bearer token and sets the user resolved from the database", async () => {
    const { run, verify, execute } = setup();

    const { allowed, request } = await run("Bearer the-token");

    expect(allowed).toBe(true);
    expect(verify).toHaveBeenCalledWith("the-token");
    expect(execute).toHaveBeenCalledWith({ userId: USER_ID, tokenIssuedAt: ISSUED_AT });
    expect(request.user).toBe(user);
  });

  it("accepts the scheme in any case", async () => {
    const { run, verify } = setup();

    await run("bearer the-token");
    expect(verify).toHaveBeenCalledWith("the-token");
  });

  it.each([
    ["without an Authorization header", undefined],
    ["with another scheme", "Basic dXNlcjpwYXNz"],
    ["with the scheme only", "Bearer"],
    ["with an empty token", "Bearer "],
    ["with the token only", "the-token"],
    ["with two tokens", "Bearer one two"],
  ])("rejects a request %s", async (_label, authorization) => {
    const { run, verify } = setup();

    await expect(run(authorization)).rejects.toThrow(InvalidAccessTokenError);
    expect(verify).not.toHaveBeenCalled();
  });

  it("rejects a token the port does not trust", async () => {
    const { run, verify, execute } = setup();
    verify.mockImplementation(() => {
      throw new InvalidAccessTokenError();
    });

    await expect(run("Bearer the-token")).rejects.toThrow(InvalidAccessTokenError);
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects a user who can no longer authenticate", async () => {
    const { run, execute } = setup();
    execute.mockRejectedValue(new InvalidAccessTokenError());

    await expect(run("Bearer the-token")).rejects.toThrow(InvalidAccessTokenError);
  });

  it("keeps an unexpected error thrown while resolving the user", async () => {
    const { run, execute } = setup();
    const failure = new Error("database down");
    execute.mockRejectedValue(failure);

    await expect(run("Bearer the-token")).rejects.toBe(failure);
  });
});
