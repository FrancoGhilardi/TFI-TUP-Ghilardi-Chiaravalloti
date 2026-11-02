import type { ExecutionContext } from "@nestjs/common";
import { UserRole } from "../../domain/user-role.js";
import type { AuthUser } from "../auth-user.js";
import { currentUserOf } from "./current-user.decorator.js";

function contextWith(user?: AuthUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe("currentUserOf", () => {
  it("returns the authenticated user of the request", () => {
    const user: AuthUser = {
      id: "user-1",
      email: "ana@example.com",
      name: "Ana",
      role: UserRole.ADMIN,
      mustChangePassword: false,
    };

    expect(currentUserOf(contextWith(user))).toBe(user);
  });

  it("fails when the request has no authenticated user", () => {
    expect(() => currentUserOf(contextWith())).toThrow(
      "@CurrentUser() requires an endpoint that is not public",
    );
  });
});
