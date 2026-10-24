import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { Resend } from "resend";
import type { Env } from "../../config/env.js";
import { Clock } from "../../shared/application/clock.js";
import { IdGenerator } from "../../shared/application/id-generator.js";
import { TransactionManager } from "../../shared/application/transaction-manager.js";
import { AuthSettings } from "./application/auth-settings.js";
import { AccessTokenService } from "./application/ports/access-token-service.js";
import { PasswordHasher } from "./application/ports/password-hasher.js";
import { PasswordResetNotifier } from "./application/ports/password-reset-notifier.js";
import { RefreshTokenService } from "./application/ports/refresh-token-service.js";
import { SecurityEventLog } from "./application/ports/security-event-log.js";
import { TemporaryPasswordGenerator } from "./application/ports/temporary-password-generator.js";
import { SessionIssuer } from "./application/services/session-issuer.js";
import { ChangePasswordUseCase } from "./application/use-cases/change-password.use-case.js";
import { LoginUseCase } from "./application/use-cases/login.use-case.js";
import { LogoutUseCase } from "./application/use-cases/logout.use-case.js";
import { RefreshSessionUseCase } from "./application/use-cases/refresh-session.use-case.js";
import { RequestPasswordResetUseCase } from "./application/use-cases/request-password-reset.use-case.js";
import { ResolveAuthenticatedUserUseCase } from "./application/use-cases/resolve-authenticated-user.use-case.js";
import { SessionRepository } from "./domain/repositories/session.repository.js";
import { UserRepository } from "./domain/repositories/user.repository.js";
import { Argon2PasswordHasher } from "./infrastructure/argon2-password-hasher.js";
import { LoggerSecurityEventLog } from "./infrastructure/logging/logger-security-event-log.js";
import { LoggerPasswordResetNotifier } from "./infrastructure/mail/logger-password-reset-notifier.js";
import { ResendPasswordResetNotifier } from "./infrastructure/mail/resend-password-reset-notifier.js";
import { DrizzleSessionRepository } from "./infrastructure/persistence/drizzle-session.repository.js";
import { DrizzleUserRepository } from "./infrastructure/persistence/drizzle-user.repository.js";
import { CryptoTemporaryPasswordGenerator } from "./infrastructure/security/crypto-temporary-password-generator.js";
import { JwtAccessTokenService } from "./infrastructure/security/jwt-access-token.service.js";
import { Sha256RefreshTokenService } from "./infrastructure/security/sha256-refresh-token.service.js";
import { OriginGuard } from "./presentation/guards/origin.guard.js";
import { AuthController } from "./presentation/http/auth.controller.js";
import { RefreshTokenCookie } from "./presentation/http/refresh-token-cookie.js";

@Module({
  // The secret and lifetime are passed on each call by JwtAccessTokenService.
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    OriginGuard,
    RefreshTokenCookie,
    {
      provide: AuthSettings,
      useFactory: (config: ConfigService<Env, true>) =>
        new AuthSettings(config.get("REFRESH_TOKEN_TTL_DAYS", { infer: true })),
      inject: [ConfigService],
    },
    { provide: UserRepository, useClass: DrizzleUserRepository },
    { provide: SessionRepository, useClass: DrizzleSessionRepository },
    { provide: AccessTokenService, useClass: JwtAccessTokenService },
    { provide: RefreshTokenService, useClass: Sha256RefreshTokenService },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: SecurityEventLog, useClass: LoggerSecurityEventLog },
    { provide: TemporaryPasswordGenerator, useClass: CryptoTemporaryPasswordGenerator },
    {
      provide: PasswordResetNotifier,
      useFactory: (config: ConfigService<Env, true>) => {
        const loginUrl = new URL("/admin/login", config.get("FRONTEND_URL", { infer: true }));
        const apiKey = config.get("RESEND_API_KEY", { infer: true });
        const from = config.get("MAIL_FROM", { infer: true });
        // Both are required in production, so the log is only used to work locally.
        return apiKey && from
          ? new ResendPasswordResetNotifier(new Resend(apiKey).emails, from, loginUrl.toString())
          : new LoggerPasswordResetNotifier(loginUrl.toString());
      },
      inject: [ConfigService],
    },
    {
      provide: SessionIssuer,
      useFactory: (
        sessions: SessionRepository,
        accessTokens: AccessTokenService,
        refreshTokens: RefreshTokenService,
        ids: IdGenerator,
        clock: Clock,
        settings: AuthSettings,
      ) => new SessionIssuer(sessions, accessTokens, refreshTokens, ids, clock, settings),
      inject: [
        SessionRepository,
        AccessTokenService,
        RefreshTokenService,
        IdGenerator,
        Clock,
        AuthSettings,
      ],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        sessionIssuer: SessionIssuer,
        transaction: TransactionManager,
        clock: Clock,
      ) => new LoginUseCase(users, hasher, sessionIssuer, transaction, clock),
      inject: [UserRepository, PasswordHasher, SessionIssuer, TransactionManager, Clock],
    },
    {
      provide: RefreshSessionUseCase,
      useFactory: (
        sessions: SessionRepository,
        users: UserRepository,
        refreshTokens: RefreshTokenService,
        sessionIssuer: SessionIssuer,
        transaction: TransactionManager,
        clock: Clock,
        securityLog: SecurityEventLog,
      ) =>
        new RefreshSessionUseCase(
          sessions,
          users,
          refreshTokens,
          sessionIssuer,
          transaction,
          clock,
          securityLog,
        ),
      inject: [
        SessionRepository,
        UserRepository,
        RefreshTokenService,
        SessionIssuer,
        TransactionManager,
        Clock,
        SecurityEventLog,
      ],
    },
    {
      provide: LogoutUseCase,
      useFactory: (
        sessions: SessionRepository,
        users: UserRepository,
        refreshTokens: RefreshTokenService,
        transaction: TransactionManager,
        clock: Clock,
      ) => new LogoutUseCase(sessions, users, refreshTokens, transaction, clock),
      inject: [SessionRepository, UserRepository, RefreshTokenService, TransactionManager, Clock],
    },
    {
      provide: ChangePasswordUseCase,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        sessionIssuer: SessionIssuer,
        transaction: TransactionManager,
        clock: Clock,
      ) => new ChangePasswordUseCase(users, hasher, sessionIssuer, transaction, clock),
      inject: [UserRepository, PasswordHasher, SessionIssuer, TransactionManager, Clock],
    },
    {
      provide: RequestPasswordResetUseCase,
      useFactory: (
        users: UserRepository,
        generator: TemporaryPasswordGenerator,
        hasher: PasswordHasher,
        notifier: PasswordResetNotifier,
        transaction: TransactionManager,
        clock: Clock,
        settings: AuthSettings,
      ) =>
        new RequestPasswordResetUseCase(
          users,
          generator,
          hasher,
          notifier,
          transaction,
          clock,
          settings,
        ),
      inject: [
        UserRepository,
        TemporaryPasswordGenerator,
        PasswordHasher,
        PasswordResetNotifier,
        TransactionManager,
        Clock,
        AuthSettings,
      ],
    },
    {
      provide: ResolveAuthenticatedUserUseCase,
      useFactory: (users: UserRepository) => new ResolveAuthenticatedUserUseCase(users),
      inject: [UserRepository],
    },
  ],
  // JwtAuthGuard is registered globally in AppModule and needs both.
  exports: [AccessTokenService, ResolveAuthenticatedUserUseCase],
})
export class IdentityModule {}
