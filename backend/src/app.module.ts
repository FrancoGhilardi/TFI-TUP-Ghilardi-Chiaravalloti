import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.js";
import { HealthController } from "./health/health.controller.js";
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
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: ErrorResponseFilter }],
})
export class AppModule {}
