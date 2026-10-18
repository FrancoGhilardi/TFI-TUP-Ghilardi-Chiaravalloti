import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { validateEnv } from "./config/env.js";
import { HealthController } from "./health/health.controller.js";
import { IdentityModule } from "./modules/identity/identity.module.js";
import { JwtAuthGuard } from "./modules/identity/presentation/guards/jwt-auth.guard.js";
import { MustChangePasswordGuard } from "./modules/identity/presentation/guards/must-change-password.guard.js";
import { RolesGuard } from "./modules/identity/presentation/guards/roles.guard.js";
import { ErrorResponseFilter } from "./shared/presentation/filters/error-response.filter.js";
import { RateLimitGuard } from "./shared/presentation/guards/rate-limit.guard.js";
import { RATE_LIMIT_OPTIONS } from "./shared/presentation/http/rate-limit.js";
import { DatabaseModule } from "./shared/infrastructure/database/database.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: process.env.ENV_FILE ?? ".env",
    }),
    // Counters live in memory, which fits a single instance.
    ThrottlerModule.forRoot(RATE_LIMIT_OPTIONS),
    DatabaseModule,
    IdentityModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: ErrorResponseFilter },
    // Global guards run in the order they are registered; keep the whole chain here.
    // The rate limit goes first so a throttled request never reaches the database.
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: MustChangePasswordGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
