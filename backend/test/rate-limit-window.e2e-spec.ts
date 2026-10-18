import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import {
  FORGOT_PASSWORD_RATE_LIMIT,
  LOGIN_RATE_LIMIT,
} from "./../src/modules/identity/presentation/http/auth-rate-limits.js";
import { createTestApp } from "./create-test-app.js";

// Only the clock is faked: the throttler measures its windows with Date.now(), while the
// HTTP stack keeps using real timers.
describe("Rate limit windows (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-17T12:00:00.000Z"));
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
    vi.useRealTimers();
  });

  const post = (path: string) => request(app.getHttpServer()).post(`/api/v1/auth/${path}`);

  async function exhaust(path: string, limit: number) {
    for (let i = 0; i < limit; i++) {
      await post(path).expect(501);
    }
    await post(path).expect(429);
  }

  it.each([
    ["login", LOGIN_RATE_LIMIT],
    ["forgot-password", FORGOT_PASSWORD_RATE_LIMIT],
  ])("keeps %s blocked until its window ends", async (path, { limit, ttl }) => {
    await exhaust(path, limit);

    vi.advanceTimersByTime(ttl - 1_000);
    await post(path).expect(429);
  });

  it.each([
    ["login", LOGIN_RATE_LIMIT],
    ["forgot-password", FORGOT_PASSWORD_RATE_LIMIT],
  ])("unblocks %s when its window ends", async (path, { limit, ttl }) => {
    await exhaust(path, limit);

    vi.advanceTimersByTime(ttl);
    await post(path).expect(501);
  });

  it("uses a 60 second window for login and a 15 minute window for forgot-password", () => {
    expect(LOGIN_RATE_LIMIT).toEqual({ limit: 5, ttl: 60_000 });
    expect(FORGOT_PASSWORD_RATE_LIMIT).toEqual({ limit: 3, ttl: 900_000 });
  });
});
