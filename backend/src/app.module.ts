import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.js";
import { HealthController } from "./health/health.controller.js";
import { IdentityModule } from "./modules/identity/identity.module.js";
import { JwtAuthGuard } from "./modules/identity/presentation/guards/jwt-auth.guard.js";
import { RolesGuard } from "./modules/identity/presentation/guards/roles.guard.js";
import { ErrorResponseFilter } from "./shared/presentation/filters/error-response.filter.js";
import { DatabaseModule } from "./shared/infrastructure/database/database.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: process.env.ENV_FILE ?? ".env",
    }),
    DatabaseModule,
    IdentityModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: ErrorResponseFilter },
    // Global guards run in the order they are registered; keep the whole chain here.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
