import type { INestApplication, Type } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import type { App } from "supertest/types.js";
import { AppModule } from "./../src/app.module.js";
import { setupApp } from "./../src/app.setup.js";
import type { Env } from "./../src/config/env.js";

interface TestAppOptions {
  controllers?: Type[];
  /** Pinned so the tests never depend on the TRUST_PROXY of the local .env or CI. */
  trustProxy?: number;
}

/**
 * Builds the full application. The environment is read once when AppModule is imported,
 * so `trustProxy` is injected through ConfigService instead of process.env.
 */
export async function createTestApp(options: TestAppOptions = {}): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();

  const trustProxy = options.trustProxy ?? 0;
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const realGet = config.get.bind(config) as (...args: unknown[]) => unknown;
  vi.spyOn(config, "get").mockImplementation(((...args: unknown[]) =>
    args[0] === "TRUST_PROXY" ? trustProxy : realGet(...args)) as typeof config.get);

  setupApp(app);
  await app.init();
  return app;
}
