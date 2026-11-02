import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";
import { setupApp } from "./app.setup.js";
import type { Env } from "./config/env.js";
import { setupOpenApi } from "./openapi.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  await setupOpenApi(app);
  app.enableShutdownHooks();

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(config.get("PORT", { infer: true }));
}
await bootstrap();
