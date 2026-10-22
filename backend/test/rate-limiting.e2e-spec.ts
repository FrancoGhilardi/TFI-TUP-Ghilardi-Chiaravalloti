import { Controller, Get, type INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import {
  FORGOT_PASSWORD_RATE_LIMIT,
  LOGIN_RATE_LIMIT,
} from "./../src/modules/identity/presentation/http/auth-rate-limits.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { Public } from "./../src/modules/identity/presentation/decorators/public.decorator.js";
import {
  GENERAL_RATE_LIMIT,
  StrictRateLimit,
} from "./../src/shared/presentation/http/rate-limit.js";
import { createTestApp } from "./create-test-app.js";

const CONTROLLER_RATE_LIMIT = { limit: 2, ttl: 60_000 };

@Public()
@StrictRateLimit(CONTROLLER_RATE_LIMIT)
@Controller("strict-probe")
class StrictProbeController {
  @Get()
  probe() {
    return { ok: true };
  }
}

const GENERAL_LIMIT = GENERAL_RATE_LIMIT.limit;
const ERROR_KEYS = ["code", "message", "path", "statusCode", "timestamp"];
const TOO_MANY_REQUESTS = {
  statusCode: 429,
  code: "TOO_MANY_REQUESTS",
  message: "Hiciste demasiados intentos. Esperá un momento y volvé a intentar.",
};

describe("Rate limiting (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;

  // A fresh app per test starts with every counter at zero.
  beforeEach(async () => {
    app = await createTestApp({ controllers: [StrictProbeController] });
    http = request(app.getHttpServer());
  });

  afterEach(async () => {
    await app.close();
  });

  const repeat = async (times: number, send: () => request.Test, status: number) => {
    for (let i = 0; i < times; i++) {
      await send().expect(status);
    }
  };
  const expectTooManyRequests = async (pending: request.Test, maxRetryAfter: number) => {
    const response = await pending.expect(429);
    const body = response.body as ErrorResponse;
    expect(body).toMatchObject(TOO_MANY_REQUESTS);
    expect(Object.keys(body).sort()).toEqual(ERROR_KEYS);
    // Every 429 carries the standard header, whichever limit was exceeded.
    const retryAfter = Number(response.headers["retry-after"]);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(maxRetryAfter);
  };

  it("limits login to 5 requests per minute", async () => {
    const login = () => http.post("/api/v1/auth/login");

    await repeat(LOGIN_RATE_LIMIT.limit, login, 400);
    await expectTooManyRequests(login(), 60);
  });

  it("limits forgot-password to 3 requests every 15 minutes", async () => {
    const forgotPassword = () => http.post("/api/v1/auth/forgot-password");

    await repeat(FORGOT_PASSWORD_RATE_LIMIT.limit, forgotPassword, 501);
    await expectTooManyRequests(forgotPassword(), 900);
  });

  it("applies a strict limit declared on a whole controller", async () => {
    const probe = () => http.get("/api/v1/strict-probe");

    await repeat(CONTROLLER_RATE_LIMIT.limit, probe, 200);
    await expectTooManyRequests(probe(), 60);
  });

  it("keeps the specific limits apart from each other and from the rest of the API", async () => {
    const login = () => http.post("/api/v1/auth/login");
    await repeat(LOGIN_RATE_LIMIT.limit, login, 400);
    await login().expect(429);

    await http.post("/api/v1/auth/forgot-password").expect(501);
    await http.get("/api/v1/auth/me").expect(401);
  });

  it("limits every other route to 100 requests per minute", async () => {
    const me = () => http.get("/api/v1/auth/me");

    await repeat(GENERAL_LIMIT, me, 401);
    await expectTooManyRequests(me(), 60);
  });

  it("shares the general limit across every route of the API", async () => {
    await repeat(GENERAL_LIMIT / 2, () => http.get("/api/v1/auth/me"), 401);
    await repeat(GENERAL_LIMIT / 2, () => http.post("/api/v1/auth/change-password"), 401);

    await expectTooManyRequests(http.post("/api/v1/auth/refresh"), 60);
  });

  it("counts the routes with a strict limit against the general limit too", async () => {
    await repeat(LOGIN_RATE_LIMIT.limit, () => http.post("/api/v1/auth/login"), 400);
    await repeat(GENERAL_LIMIT - LOGIN_RATE_LIMIT.limit, () => http.get("/api/v1/auth/me"), 401);

    await expectTooManyRequests(http.get("/api/v1/auth/me"), 60);
  });

  it("checks the rate limit before authentication", async () => {
    const me = () => http.get("/api/v1/auth/me");
    await repeat(GENERAL_LIMIT, me, 401);

    // Without a token, a request that got past the rate limit would answer 401.
    await me().expect(429);
  });

  it("never limits the health checks", async () => {
    await repeat(GENERAL_LIMIT + 20, () => http.get("/api/v1/health"), 200);
  });

  it("reports the limit and what is left on each response", async () => {
    const first = await http.get("/api/v1/auth/me").expect(401);
    const second = await http.get("/api/v1/auth/me").expect(401);

    expect(first.headers["x-ratelimit-limit"]).toBe(String(GENERAL_LIMIT));
    expect(first.headers["x-ratelimit-remaining"]).toBe(String(GENERAL_LIMIT - 1));
    expect(second.headers["x-ratelimit-remaining"]).toBe(String(GENERAL_LIMIT - 2));
  });

  describe("per client IP", () => {
    const loginFrom = (target: ReturnType<typeof request>, ip: string) =>
      target.post("/api/v1/auth/login").set("X-Forwarded-For", ip);

    it("counts each IP separately behind a trusted proxy", async () => {
      const proxied = await createTestApp({ trustProxy: 1 });
      const target = request(proxied.getHttpServer());
      try {
        await repeat(LOGIN_RATE_LIMIT.limit, () => loginFrom(target, "203.0.113.7"), 400);
        await loginFrom(target, "203.0.113.7").expect(429);

        await loginFrom(target, "198.51.100.9").expect(400);
      } finally {
        await proxied.close();
      }
    });

    it("does not let a client reset its counter with X-Forwarded-For", async () => {
      await repeat(LOGIN_RATE_LIMIT.limit, () => loginFrom(http, "203.0.113.7"), 400);

      await loginFrom(http, "198.51.100.9").expect(429);
    });
  });
});
