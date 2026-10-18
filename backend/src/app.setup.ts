import { type INestApplication, ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import type { Env } from "./config/env.js";
import { validationExceptionFactory } from "./shared/presentation/http/validation-exception-factory.js";

/** Global HTTP configuration, shared by main.ts and the e2e tests. */
export function setupApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.use(helmet());
  // Same origin OriginGuard accepts, so a trailing slash or path in FRONTEND_URL cannot
  // make CORS and the guard disagree.
  app.enableCors({
    origin: new URL(config.get("FRONTEND_URL", { infer: true })).origin,
    credentials: true,
  });
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
}
