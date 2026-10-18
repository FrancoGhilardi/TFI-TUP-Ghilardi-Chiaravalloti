import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../../domain/user-role.js";
import type { AuthUser } from "../auth-user.js";
import { AllowPendingPasswordChange } from "../decorators/allow-pending-password-change.decorator.js";
import { Public } from "../decorators/public.decorator.js";
import { PasswordChangeRequiredError } from "../errors/password-change-required-error.js";
import { MustChangePasswordGuard } from "./must-change-password.guard.js";

class AccountController {
  @Public()
  open() {}

  @AllowPendingPasswordChange()
  changePassword() {}

  other() {}
}

@AllowPendingPasswordChange()
class AllowedController {
  anything() {}
}

function contextFor(
  controller: new () => object,
  handler: string,
  mustChangePassword?: boolean,
): ExecutionContext {
  const user: AuthUser | undefined =
    mustChangePassword === undefined
      ? undefined
      : {
          id: "user-1",
          email: "ana@example.com",
          name: "Ana",
          role: UserRole.SELLER,
          mustChangePassword,
        };
  return {
    getHandler: () => (controller.prototype as Record<string, unknown>)[handler],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe("MustChangePasswordGuard", () => {
  const guard = new MustChangePasswordGuard(new Reflector());

  it("blocks a user with a pending change on a regular handler", () => {
    expect(() => guard.canActivate(contextFor(AccountController, "other", true))).toThrow(
      PasswordChangeRequiredError,
    );
  });

  it("blocks with a stable code and a user-facing message", () => {
    expect(() => guard.canActivate(contextFor(AccountController, "other", true))).toThrow(
      expect.objectContaining({
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Tenés que cambiar tu contraseña antes de continuar.",
      }),
    );
  });

  it("lets a user without a pending change through", () => {
    expect(guard.canActivate(contextFor(AccountController, "other", false))).toBe(true);
  });

  it("lets a user with a pending change call a handler marked as allowed", () => {
    expect(guard.canActivate(contextFor(AccountController, "changePassword", true))).toBe(true);
  });

  it("lets a user with a pending change call any handler of an allowed controller", () => {
    expect(guard.canActivate(contextFor(AllowedController, "anything", true))).toBe(true);
  });

  it("lets a public handler through", () => {
    expect(guard.canActivate(contextFor(AccountController, "open", true))).toBe(true);
    expect(guard.canActivate(contextFor(AccountController, "open"))).toBe(true);
  });

  it("leaves a request without a user to the authentication guard", () => {
    expect(guard.canActivate(contextFor(AccountController, "other"))).toBe(true);
  });
});
