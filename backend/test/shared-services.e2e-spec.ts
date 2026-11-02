import type { INestApplication } from "@nestjs/common";
import type { App } from "supertest/types.js";
import { Clock } from "./../src/shared/application/clock.js";
import { IdGenerator } from "./../src/shared/application/id-generator.js";
import { CryptoIdGenerator } from "./../src/shared/infrastructure/crypto-id-generator.js";
import { SystemClock } from "./../src/shared/infrastructure/system-clock.js";
import { createTestApp } from "./create-test-app.js";

describe("Shared services (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("provides the system clock", () => {
    expect(app.get(Clock, { strict: false })).toBeInstanceOf(SystemClock);
  });

  it("provides the UUID generator", () => {
    expect(app.get(IdGenerator, { strict: false })).toBeInstanceOf(CryptoIdGenerator);
  });
});
