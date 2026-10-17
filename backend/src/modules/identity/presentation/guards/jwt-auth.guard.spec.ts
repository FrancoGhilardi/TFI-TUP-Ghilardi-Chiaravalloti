import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { InvalidAccessTokenError } from "../../application/errors/invalid-access-token-error.js";
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

function contextFor(controller: new () => object, handler: string): ExecutionContext {
  return {
    getHandler: () => (controller.prototype as Record<string, unknown>)[handler],
    getClass: () => controller,
  } as unknown as ExecutionContext;
}

const user: AuthUser = {
  id: "user-1",
  email: "ana@example.com",
  name: "Ana",
  role: UserRole.ADMIN,
  mustChangePassword: false,
};

describe("JwtAuthGuard", () => {
  const guard = new JwtAuthGuard(new Reflector());
  let passport: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const base = Object.getPrototypeOf(JwtAuthGuard.prototype) as InstanceType<
      ReturnType<typeof AuthGuard>
    >;
    passport = vi.spyOn(base, "canActivate").mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lets a public handler through without checking the token", () => {
    expect(guard.canActivate(contextFor(MixedController, "open"))).toBe(true);
    expect(passport).not.toHaveBeenCalled();
  });

  it("lets every handler of a public controller through without checking the token", () => {
    expect(guard.canActivate(contextFor(PublicController, "anything"))).toBe(true);
    expect(passport).not.toHaveBeenCalled();
  });

  it("checks the token on a handler that is not public", async () => {
    const context = contextFor(MixedController, "closed");

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(passport).toHaveBeenCalledWith(context);
  });

  describe("handleRequest", () => {
    it("returns the resolved user", () => {
      expect(guard.handleRequest(null, user)).toBe(user);
    });

    it("rejects a missing or invalid token with InvalidAccessTokenError", () => {
      expect(() => guard.handleRequest(null, false)).toThrow(InvalidAccessTokenError);
    });

    it("keeps the error thrown while resolving the user", () => {
      const failure = new Error("database down");

      expect(() => guard.handleRequest(failure, false)).toThrow(failure);
    });
  });
});
