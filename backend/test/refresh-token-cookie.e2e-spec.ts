import { Controller, Get, type INestApplication, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import request from "supertest";
import type { App } from "supertest/types.js";
import { Public } from "./../src/modules/identity/presentation/decorators/public.decorator.js";
import { RefreshTokenCookie } from "./../src/modules/identity/presentation/http/refresh-token-cookie.js";
import { createTestApp } from "./create-test-app.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const cookie = new RefreshTokenCookie();

@Controller("cookie-probe")
@Public()
class CookieProbeController {
  @Get()
  read(@Req() req: Request) {
    return { token: cookie.read(req) ?? null };
  }

  @Post("clear")
  clear(@Res({ passthrough: true }) res: Response) {
    cookie.clear(res);
    return { ok: true };
  }
}

describe("RefreshTokenCookie (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp({ controllers: [CookieProbeController] });
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it("reads the token from the Cookie header of any request", async () => {
    const response = await http
      .get("/api/v1/cookie-probe")
      .set("Cookie", "theme=dark; __Secure-refresh_token=abc_DEF-123")
      .expect(200);

    expect(response.body).toEqual({ token: "abc_DEF-123" });
  });

  it("reads nothing when the request carries no cookie", async () => {
    const response = await http.get("/api/v1/cookie-probe").expect(200);

    expect(response.body).toEqual({ token: null });
  });

  it("clears the cookie with the attributes it was written with and a past expiry", async () => {
    const response = await http.post("/api/v1/cookie-probe/clear").expect(201);

    const setCookie = response.get("Set-Cookie") ?? [];
    expect(setCookie).toHaveLength(1);
    const attributes = setCookie[0]?.split("; ") ?? [];
    expect(attributes[0]).toBe("__Secure-refresh_token=");
    expect(attributes).toEqual(
      expect.arrayContaining([
        "Path=/api/v1/auth",
        "HttpOnly",
        "Secure",
        "SameSite=Strict",
        "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      ]),
    );
    expect(attributes.some((attribute) => attribute.startsWith("Domain="))).toBe(false);
  });
});
