import type { Abstract, INestApplication, Type } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { Test } from "@nestjs/testing";
import type { App } from "supertest/types.js";
import { AppModule } from "./../src/app.module.js";
import { setupApp } from "./../src/app.setup.js";
import type { Env } from "./../src/config/env.js";

interface TestAppOptions {
  controllers?: Type[];
  /** Providers replaced by a test double, such as the mail notifier. */
  overrides?: { provide: Abstract<unknown>; useValue: unknown }[];
  /** Pinned so the tests never depend on the TRUST_PROXY of the local .env or CI. */
  trustProxy?: number;
}

/**
 * Builds the full application. The environment is read once when AppModule is imported,
 * so `trustProxy` is injected through ConfigService instead of process.env.
 */
export async function createTestApp(options: TestAppOptions = {}): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  });
  for (const { provide, useValue } of options.overrides ?? []) {
    builder.overrideProvider(provide).useValue(useValue);
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();

  const trustProxy = options.trustProxy ?? 0;
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const realGet = config.get.bind(config) as (...args: unknown[]) => unknown;
  vi.spyOn(config, "get").mockImplementation(((...args: unknown[]) =>
    args[0] === "TRUST_PROXY" ? trustProxy : realGet(...args)) as typeof config.get);

  setupApp(app);
  await app.init();
  // No test depends on the real time: a job that matters is run by hand with a test clock.
  for (const job of app.get(SchedulerRegistry).getCronJobs().values()) {
    await job.stop();
  }
  return app;
}
