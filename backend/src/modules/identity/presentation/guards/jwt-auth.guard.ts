import { type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { InvalidAccessTokenError } from "../../application/errors/invalid-access-token-error.js";
import type { AuthUser } from "../auth-user.js";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";

/** Requires a valid access token on every endpoint not marked with `@Public()`. */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ? true : super.canActivate(context);
  }

  // Passport reports a bad token as a missing user and errors thrown while resolving the
  // user as `error`; replace the former so passport's own exception never reaches the client.
  handleRequest<TUser = AuthUser>(error: unknown, user: TUser | false): TUser {
    if (error instanceof Error) {
      throw error;
    }
    if (!user) {
      throw new InvalidAccessTokenError();
    }
    return user;
  }
}
