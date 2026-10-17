import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthUser } from "../auth-user.js";

/** Reads the authenticated user; fails loudly when used where nobody is authenticated. */
export function currentUserOf(context: ExecutionContext): AuthUser {
  const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
  if (!user) {
    throw new Error("@CurrentUser() requires an endpoint that is not public");
  }
  return user;
}

/** Injects the authenticated user into a handler parameter. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  currentUserOf(context),
);
