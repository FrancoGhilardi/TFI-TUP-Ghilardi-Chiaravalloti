import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { Env } from "../../config/env.js";
import { Clock } from "../../shared/application/clock.js";
import { IdGenerator } from "../../shared/application/id-generator.js";
import { TransactionManager } from "../../shared/application/transaction-manager.js";
import { AuthSettings } from "./application/auth-settings.js";
import { AccessTokenService } from "./application/ports/access-token-service.js";
import { PasswordHasher } from "./application/ports/password-hasher.js";
import { RefreshTokenService } from "./application/ports/refresh-token-service.js";
import { SessionIssuer } from "./application/services/session-issuer.js";
import { LoginUseCase } from "./application/use-cases/login.use-case.js";
import { ResolveAuthenticatedUserUseCase } from "./application/use-cases/resolve-authenticated-user.use-case.js";
import { SessionRepository } from "./domain/repositories/session.repository.js";
import { UserRepository } from "./domain/repositories/user.repository.js";
import { Argon2PasswordHasher } from "./infrastructure/argon2-password-hasher.js";
import { DrizzleSessionRepository } from "./infrastructure/persistence/drizzle-session.repository.js";
import { DrizzleUserRepository } from "./infrastructure/persistence/drizzle-user.repository.js";
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
      provide: ResolveAuthenticatedUserUseCase,
      useFactory: (users: UserRepository) => new ResolveAuthenticatedUserUseCase(users),
      inject: [UserRepository],
    },
  ],
  // JwtAuthGuard is registered globally in AppModule and needs both.
  exports: [AccessTokenService, ResolveAuthenticatedUserUseCase],
})
export class IdentityModule {}
