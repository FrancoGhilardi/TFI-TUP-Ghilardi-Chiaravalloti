import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthUser } from "../auth-user.js";
import { ALLOW_PENDING_PASSWORD_CHANGE_KEY } from "../decorators/allow-pending-password-change.decorator.js";
import { isPublic } from "../decorators/public.decorator.js";
import { PasswordChangeRequiredError } from "../errors/password-change-required-error.js";

/**
 * Blocks a user with a pending password change everywhere except the endpoints marked
 * with `@AllowPendingPasswordChange()`. Runs after `JwtAuthGuard`, which sets the user.
 */
@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (
      isPublic(this.reflector, context) ||
      this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_PASSWORD_CHANGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (user?.mustChangePassword) {
      throw new PasswordChangeRequiredError();
    }
    return true;
  }
}
