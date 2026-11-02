import {
  applyDecorators,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { BackgroundTasks } from "../../../../shared/application/background-tasks.js";
import {
  ApiErrors,
  REFRESH_TOKEN_AUTH,
  VALIDATION_FAILED,
} from "../../../../shared/presentation/http/openapi-decorators.js";
import { StrictRateLimit } from "../../../../shared/presentation/http/rate-limit.js";
import { InvalidSessionError } from "../../application/errors/invalid-session-error.js";
import { ChangePasswordUseCase } from "../../application/use-cases/change-password.use-case.js";
import { LoginUseCase } from "../../application/use-cases/login.use-case.js";
import { LogoutUseCase } from "../../application/use-cases/logout.use-case.js";
import { RequestPasswordResetUseCase } from "../../application/use-cases/request-password-reset.use-case.js";
import { RefreshSessionUseCase } from "../../application/use-cases/refresh-session.use-case.js";
import { UserRole } from "../../domain/user-role.js";
import type { AuthUser } from "../auth-user.js";
import { AllowPendingPasswordChange } from "../decorators/allow-pending-password-change.decorator.js";
import { CurrentUser } from "../decorators/current-user.decorator.js";
import { Public } from "../decorators/public.decorator.js";
import { Roles } from "../decorators/roles.decorator.js";
import { OriginGuard } from "../guards/origin.guard.js";
import { AccessTokenResponseDto } from "./access-token.response.dto.js";
import {
  CHANGE_PASSWORD_RATE_LIMIT,
  FORGOT_PASSWORD_RATE_LIMIT,
  LOGIN_RATE_LIMIT,
} from "./auth-rate-limits.js";
import { ChangePasswordRequestDto } from "./change-password.request.dto.js";
import { AuthenticatedUserResponseDto } from "./authenticated-user.response.dto.js";
import { ForgotPasswordRequestDto } from "./forgot-password.request.dto.js";
import { LoginRequestDto } from "./login.request.dto.js";
import { RefreshTokenCookie } from "./refresh-token-cookie.js";

// Responses with tokens or account data must not be kept by the browser or a proxy.
const NO_STORE = "no-store";

// The refresh and the logout read the cookie and only accept the frontend origin.
const ApiRefreshCookies = () =>
  applyDecorators(
    ApiCookieAuth(REFRESH_TOKEN_AUTH),
    ApiHeader({
      name: "Origin",
      required: false,
      description: "The frontend origin; without it, the origin of `Referer` is used.",
    }),
  );

/** Authentication endpoints: sessions, passwords and the authenticated user. */
@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly backgroundTasks: BackgroundTasks,
    private readonly refreshTokenCookie: RefreshTokenCookie,
  ) {}

  @Post("login")
  @Public()
  @StrictRateLimit(LOGIN_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", NO_STORE)
  @ApiOperation({ summary: "Start a session; the refresh token comes in the cookie" })
  @ApiOkResponse({ type: AccessTokenResponseDto })
  @ApiErrors({ 400: [VALIDATION_FAILED], 401: ["INVALID_CREDENTIALS"] })
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Mail a temporary password; always 204, whether the email exists or not",
  })
  @ApiNoContentResponse()
  @ApiErrors({ 400: [VALIDATION_FAILED] })
  forgotPassword(@Body() body: ForgotPasswordRequestDto): void {
    // Not awaited: looking the account up, hashing and mailing only happen when the email
    // exists, so waiting for them would let the response time reveal it.
    this.backgroundTasks.run("Password reset request", () =>
      this.requestPasswordResetUseCase.execute({ email: body.email }),
    );
  }

  @Post("change-password")
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @AllowPendingPasswordChange()
  @StrictRateLimit(CHANGE_PASSWORD_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", NO_STORE)
  @ApiOperation({ summary: "Change the own password; the other sessions are closed" })
  @ApiOkResponse({ type: AccessTokenResponseDto })
  @ApiErrors({
    400: [VALIDATION_FAILED, "INVALID_PASSWORD", "INVALID_CURRENT_PASSWORD"],
    422: ["PASSWORD_UNCHANGED"],
  })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() body: ChangePasswordRequestDto,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponseDto> {
    // The new password revokes every session of the user, so this device gets a new one.
    const session = await this.changePasswordUseCase.execute({
      userId: user.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      userAgent,
    });
    this.refreshTokenCookie.write(res, session.refreshToken, session.refreshTokenExpiresAt);
    return AccessTokenResponseDto.from(session);
  }

  @Get("me")
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @AllowPendingPasswordChange()
  @Header("Cache-Control", NO_STORE)
  @ApiOperation({ summary: "The authenticated user" })
  @ApiOkResponse({ type: AuthenticatedUserResponseDto })
  me(@CurrentUser() user: AuthUser): AuthenticatedUserResponseDto {
    // JwtAuthGuard read the user from the database for this request, so it is current.
    return AuthenticatedUserResponseDto.from(user);
  }

  // These read the refresh token cookie instead of the access token, so they are public
  // for the JWT guard and check the request origin against CSRF.
  @Post("refresh")
  @Public()
  @UseGuards(OriginGuard)
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", NO_STORE)
  @ApiOperation({ summary: "Rotate the refresh token and get a new access token" })
  @ApiRefreshCookies()
  @ApiOkResponse({ type: AccessTokenResponseDto })
  @ApiErrors({ 401: ["INVALID_SESSION"], 403: ["ORIGIN_NOT_ALLOWED"] })
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Close the session and the ones renewed from it" })
  @ApiRefreshCookies()
  @ApiNoContentResponse()
  @ApiErrors({ 403: ["ORIGIN_NOT_ALLOWED"] })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.logoutUseCase.execute({ refreshToken: this.refreshTokenCookie.read(req) });
    // Cleared only once the session is revoked; after a failure the cookie stays for a retry.
    this.refreshTokenCookie.clear(res);
  }
}
