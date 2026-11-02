import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { App } from "supertest/types.js";
import type { Env } from "./../src/config/env.js";
import { AuthSettings } from "./../src/modules/identity/application/auth-settings.js";
import { createTestApp } from "./create-test-app.js";

describe("AuthSettings (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("takes the session lifetime from the environment", () => {
    const config = app.get<ConfigService<Env, true>>(ConfigService);

    expect(app.get(AuthSettings, { strict: false })).toEqual(
      new AuthSettings(config.get("REFRESH_TOKEN_TTL_DAYS", { infer: true })),
    );
  });
});
