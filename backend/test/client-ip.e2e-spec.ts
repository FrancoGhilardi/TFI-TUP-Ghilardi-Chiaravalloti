import { Controller, Get, type INestApplication, Req } from "@nestjs/common";
import type { Request } from "express";
import request from "supertest";
import type { App } from "supertest/types.js";
import { Public } from "./../src/modules/identity/presentation/decorators/public.decorator.js";
import { createTestApp } from "./create-test-app.js";

@Public()
@Controller("ip-probe")
class IpProbeController {
  @Get()
  ip(@Req() req: Request) {
    return { ip: req.ip };
  }
}

async function ipSeenBy(app: INestApplication<App>, forwardedFor?: string): Promise<string> {
  const pending = request(app.getHttpServer()).get("/api/v1/ip-probe");
  if (forwardedFor !== undefined) pending.set("X-Forwarded-For", forwardedFor);
  return ((await pending.expect(200)).body as { ip: string }).ip;
}

describe("Client IP (e2e)", () => {
  describe("without trusted proxies", () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await createTestApp({ controllers: [IpProbeController], trustProxy: 0 });
    });

    afterAll(async () => {
      await app.close();
    });

    it("uses the connection address and ignores X-Forwarded-For", async () => {
      const direct = await ipSeenBy(app);

      expect(await ipSeenBy(app, "203.0.113.7")).toBe(direct);
      expect(direct).not.toBe("203.0.113.7");
    });
  });

  describe("behind one trusted proxy", () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await createTestApp({ controllers: [IpProbeController], trustProxy: 1 });
    });

    afterAll(async () => {
      await app.close();
    });

    it("uses the address added by the proxy", async () => {
      expect(await ipSeenBy(app, "203.0.113.7")).toBe("203.0.113.7");
    });

    it("ignores addresses the client prepended before the proxy", async () => {
      expect(await ipSeenBy(app, "198.51.100.9, 203.0.113.7")).toBe("203.0.113.7");
    });
  });
});
