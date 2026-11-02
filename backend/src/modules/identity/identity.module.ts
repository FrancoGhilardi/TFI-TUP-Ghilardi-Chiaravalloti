import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AccessTokenService } from "./application/ports/access-token-service.js";
import { ResolveAuthenticatedUserUseCase } from "./application/use-cases/resolve-authenticated-user.use-case.js";
import { UserRepository } from "./domain/repositories/user.repository.js";
import { DrizzleUserRepository } from "./infrastructure/persistence/drizzle-user.repository.js";
import { JwtAccessTokenService } from "./infrastructure/security/jwt-access-token.service.js";
import { OriginGuard } from "./presentation/guards/origin.guard.js";
import { AuthController } from "./presentation/http/auth.controller.js";
import { JwtStrategy } from "./presentation/strategies/jwt.strategy.js";

@Module({
  // The secret and lifetime are passed on each signature by JwtAccessTokenService.
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    OriginGuard,
    { provide: UserRepository, useClass: DrizzleUserRepository },
    { provide: AccessTokenService, useClass: JwtAccessTokenService },
    {
      provide: ResolveAuthenticatedUserUseCase,
      useFactory: (users: UserRepository) => new ResolveAuthenticatedUserUseCase(users),
      inject: [UserRepository],
    },
    JwtStrategy,
  ],
  exports: [AccessTokenService],
})
export class IdentityModule {}
