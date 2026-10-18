import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { StrictRateLimit } from "../../../../shared/presentation/http/rate-limit.js";
import { NotImplementedYetError } from "../../../../shared/presentation/http/not-implemented-yet-error.js";
import { UserRole } from "../../domain/user-role.js";
import { AllowPendingPasswordChange } from "../decorators/allow-pending-password-change.decorator.js";
import { Public } from "../decorators/public.decorator.js";
import { Roles } from "../decorators/roles.decorator.js";
import { OriginGuard } from "../guards/origin.guard.js";
import { FORGOT_PASSWORD_RATE_LIMIT, LOGIN_RATE_LIMIT } from "./auth-rate-limits.js";

/**
 * Authentication endpoints. A handler without its use case answers 501, so the access
 * rules of the route apply and can be tested on their own.
 */
@Controller("auth")
export class AuthController {
  @Post("login")
  @Public()
  @StrictRateLimit(LOGIN_RATE_LIMIT)
  login(): never {
    throw new NotImplementedYetError();
  }

  @Post("forgot-password")
  @Public()
  @StrictRateLimit(FORGOT_PASSWORD_RATE_LIMIT)
  forgotPassword(): never {
    throw new NotImplementedYetError();
  }

  @Post("change-password")
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @AllowPendingPasswordChange()
  changePassword(): never {
    throw new NotImplementedYetError();
  }

  @Get("me")
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @AllowPendingPasswordChange()
  me(): never {
    throw new NotImplementedYetError();
  }

  // These read the refresh token cookie instead of the access token, so they are public
  // for the JWT guard and check the request origin against CSRF.
  @Post("refresh")
  @Public()
  @UseGuards(OriginGuard)
  refresh(): never {
    throw new NotImplementedYetError();
  }

  @Post("logout")
  @Public()
  @UseGuards(OriginGuard)
  logout(): never {
    throw new NotImplementedYetError();
  }
}
