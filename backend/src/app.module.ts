import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.js";
import { HealthController } from "./health/health.controller.js";
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
})
export class AppModule {}
