import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { StrictRateLimit } from "../../../../shared/presentation/http/rate-limit.js";
import { NotImplementedYetError } from "../../../../shared/presentation/http/not-implemented-yet-error.js";
import { InvalidSessionError } from "../../application/errors/invalid-session-error.js";
import { LoginUseCase } from "../../application/use-cases/login.use-case.js";
import { RefreshSessionUseCase } from "../../application/use-cases/refresh-session.use-case.js";
import { UserRole } from "../../domain/user-role.js";
import { AllowPendingPasswordChange } from "../decorators/allow-pending-password-change.decorator.js";
import { Public } from "../decorators/public.decorator.js";
import { Roles } from "../decorators/roles.decorator.js";
import { OriginGuard } from "../guards/origin.guard.js";
import { AccessTokenResponseDto } from "./access-token.response.dto.js";
import { FORGOT_PASSWORD_RATE_LIMIT, LOGIN_RATE_LIMIT } from "./auth-rate-limits.js";
import { LoginRequestDto } from "./login.request.dto.js";
import { RefreshTokenCookie } from "./refresh-token-cookie.js";

/**
 * Authentication endpoints. A handler without its use case answers 501, so the access
 * rules of the route apply and can be tested on their own.
 */
@Controller("auth")
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly refreshTokenCookie: RefreshTokenCookie,
  ) {}

  @Post("login")
  @Public()
  @StrictRateLimit(LOGIN_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginRequestDto,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponseDto> {
    const session = await this.loginUseCase.execute({
      email: body.email,
      password: body.password,
      userAgent,
    });
    this.refreshTokenCookie.write(res, session.refreshToken, session.refreshTokenExpiresAt);
    return AccessTokenResponseDto.from(session);
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
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponseDto> {
    try {
      const session = await this.refreshSessionUseCase.execute({
        refreshToken: this.refreshTokenCookie.read(req),
        userAgent,
      });
      this.refreshTokenCookie.write(res, session.refreshToken, session.refreshTokenExpiresAt);
      return AccessTokenResponseDto.from(session);
    } catch (error) {
      // A token that no longer works is dropped, so the browser stops sending it.
      if (error instanceof InvalidSessionError) {
        this.refreshTokenCookie.clear(res);
      }
      throw error;
    }
  }

  @Post("logout")
  @Public()
  @UseGuards(OriginGuard)
  logout(): never {
    throw new NotImplementedYetError();
  }
}
