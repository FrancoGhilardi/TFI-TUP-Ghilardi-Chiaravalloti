import type { Abstract, INestApplication, Type } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { BackgroundTasks } from "./../src/shared/application/background-tasks.js";
import type { LoggingBackgroundTasks } from "./../src/shared/infrastructure/logging-background-tasks.js";
import { Test } from "@nestjs/testing";
import type { App } from "supertest/types.js";
import { AppModule } from "./../src/app.module.js";
import { setupApp } from "./../src/app.setup.js";
import { setupOpenApi } from "./../src/openapi.js";
import type { Env } from "./../src/config/env.js";

interface TestAppOptions {
  controllers?: Type[];
  /** Providers replaced by a test double, such as the mail notifier. */
  overrides?: { provide: Abstract<unknown>; useValue: unknown }[];
  /** Pinned so the tests never depend on the TRUST_PROXY of the local .env or CI. */
  trustProxy?: number;
  /** Other settings read as if they came from the environment, such as NODE_ENV. */
  env?: Partial<Env>;
}

/**
 * Builds the full application. The environment is read once when AppModule is imported,
 * so `trustProxy` and `env` are injected through ConfigService instead of process.env.
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

  const settings: Partial<Env> = { TRUST_PROXY: options.trustProxy ?? 0, ...options.env };
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const realGet = config.get.bind(config) as (...args: unknown[]) => unknown;
  vi.spyOn(config, "get").mockImplementation(((...args: unknown[]) => {
    const key = args[0] as keyof Env;
    return key in settings ? settings[key] : realGet(...args);
  }) as typeof config.get);

  setupApp(app);
  await setupOpenApi(app);
  await app.init();
  // No test depends on the real time: a job that matters is run by hand with a test clock.
  for (const job of app.get(SchedulerRegistry).getCronJobs().values()) {
    await job.stop();
  }
  // The work the app starts on its own, such as reprocessing stalled images, is over before
  // any test touches the data.
  const background = app.get<BackgroundTasks, Partial<LoggingBackgroundTasks>>(BackgroundTasks);
  await background.idle?.();
  return app;
}
