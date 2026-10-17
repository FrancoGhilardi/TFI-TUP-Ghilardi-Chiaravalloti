import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../../domain/user-role.js";
import type { AuthUser } from "../auth-user.js";
import { Public } from "../decorators/public.decorator.js";
import { Roles } from "../decorators/roles.decorator.js";
import { InsufficientRoleError } from "../errors/insufficient-role-error.js";
import { RolesGuard } from "./roles.guard.js";

class PlainController {
  @Public()
  open() {}

  unannotated() {}

  @Roles(UserRole.ADMIN)
  adminOnly() {}

  @Roles(UserRole.ADMIN, UserRole.SELLER)
  anyRole() {}
}

@Roles(UserRole.ADMIN)
class AdminController {
  inherited() {}

  @Roles(UserRole.ADMIN, UserRole.SELLER)
  widened() {}

  @Public()
  open() {}
}

@Public()
class PublicController {
  anything() {}
}

type Handler = keyof PlainController | keyof AdminController | keyof PublicController;

function contextFor(
  controller: new () => object,
  handler: Handler,
  role?: UserRole,
): ExecutionContext {
  const user: AuthUser | undefined = role && {
    id: "user-1",
    email: "ana@example.com",
    name: "Ana",
    role,
    mustChangePassword: false,
  };
  return {
    getHandler: () => (controller.prototype as Record<string, unknown>)[handler],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  const guard = new RolesGuard(new Reflector());
  const allows = (context: ExecutionContext) => guard.canActivate(context);
  const denies = (context: ExecutionContext) =>
    expect(() => guard.canActivate(context)).toThrow(InsufficientRoleError);

  it.each([undefined, UserRole.SELLER, UserRole.ADMIN])(
    "lets a public handler through for %s",
    (role) => {
      expect(allows(contextFor(PlainController, "open", role))).toBe(true);
    },
  );

  it("lets every handler of a public controller through", () => {
    expect(allows(contextFor(PublicController, "anything"))).toBe(true);
  });

  it.each([UserRole.SELLER, UserRole.ADMIN])(
    "denies a protected handler without @Roles to %s",
    (role) => {
      denies(contextFor(PlainController, "unannotated", role));
    },
  );

  it("allows an ADMIN-only handler to an ADMIN and denies it to a SELLER", () => {
    expect(allows(contextFor(PlainController, "adminOnly", UserRole.ADMIN))).toBe(true);
    denies(contextFor(PlainController, "adminOnly", UserRole.SELLER));
  });

  it.each([UserRole.SELLER, UserRole.ADMIN])(
    "allows a handler open to both roles to %s",
    (role) => {
      expect(allows(contextFor(PlainController, "anyRole", role))).toBe(true);
    },
  );

  it("applies the controller roles to handlers without their own", () => {
    expect(allows(contextFor(AdminController, "inherited", UserRole.ADMIN))).toBe(true);
    denies(contextFor(AdminController, "inherited", UserRole.SELLER));
  });

  it("lets the handler roles override the controller roles", () => {
    expect(allows(contextFor(AdminController, "widened", UserRole.SELLER))).toBe(true);
  });

  it("lets a public handler through inside a controller with roles", () => {
    expect(allows(contextFor(AdminController, "open", UserRole.SELLER))).toBe(true);
  });

  it("denies a protected handler when the request has no user", () => {
    denies(contextFor(PlainController, "anyRole"));
  });

  it("denies with a stable code and a user-facing message", () => {
    expect(() =>
      guard.canActivate(contextFor(PlainController, "unannotated", UserRole.ADMIN)),
    ).toThrow(
      expect.objectContaining({
        code: "INSUFFICIENT_ROLE",
        message: "No tenés permiso para realizar esta acción.",
      }),
    );
  });
});
