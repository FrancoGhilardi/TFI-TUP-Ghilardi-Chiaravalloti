import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "../../domain/user-role.js";
import type { AuthUser } from "../auth-user.js";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { ROLES_KEY } from "../decorators/roles.decorator.js";
import { InsufficientRoleError } from "../errors/insufficient-role-error.js";

/**
 * Lets through only the roles declared with `@Roles()`. Denies by default: a protected
 * endpoint without `@Roles()` is closed to everyone, so nothing is left open by omission.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, targets);
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!roles?.length || !user || !roles.includes(user.role)) {
      throw new InsufficientRoleError();
    }
    return true;
  }
}
