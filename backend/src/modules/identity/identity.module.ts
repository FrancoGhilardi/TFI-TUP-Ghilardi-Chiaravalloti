import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AccessTokenService } from "./application/ports/access-token-service.js";
import { ResolveAuthenticatedUserUseCase } from "./application/use-cases/resolve-authenticated-user.use-case.js";
import { SessionRepository } from "./domain/repositories/session.repository.js";
import { UserRepository } from "./domain/repositories/user.repository.js";
import { DrizzleSessionRepository } from "./infrastructure/persistence/drizzle-session.repository.js";
import { DrizzleUserRepository } from "./infrastructure/persistence/drizzle-user.repository.js";
import { JwtAccessTokenService } from "./infrastructure/security/jwt-access-token.service.js";
import { OriginGuard } from "./presentation/guards/origin.guard.js";
import { AuthController } from "./presentation/http/auth.controller.js";

@Module({
  // The secret and lifetime are passed on each call by JwtAccessTokenService.
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    OriginGuard,
    { provide: UserRepository, useClass: DrizzleUserRepository },
    { provide: SessionRepository, useClass: DrizzleSessionRepository },
    { provide: AccessTokenService, useClass: JwtAccessTokenService },
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
