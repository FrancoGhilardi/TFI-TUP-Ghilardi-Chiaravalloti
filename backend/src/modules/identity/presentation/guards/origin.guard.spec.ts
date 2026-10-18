import type { ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Env } from "../../../../config/env.js";
import { OriginNotAllowedError } from "../errors/origin-not-allowed-error.js";
import { OriginGuard } from "./origin.guard.js";

const FRONTEND = "https://libreriamisueno.com.ar";

function guardFor(frontendUrl = FRONTEND): OriginGuard {
  return new OriginGuard({ get: () => frontendUrl } as unknown as ConfigService<Env, true>);
}

function contextWith(headers: Record<string, string | string[]>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe("OriginGuard", () => {
  const allows = (headers: Record<string, string | string[]>, guard = guardFor()) =>
    expect(guard.canActivate(contextWith(headers))).toBe(true);
  const rejects = (headers: Record<string, string | string[]>, guard = guardFor()) =>
    expect(() => guard.canActivate(contextWith(headers))).toThrow(OriginNotAllowedError);

  it("allows the frontend origin", () => {
    allows({ origin: FRONTEND });
  });

  it.each([
    ["another site", "https://evil.example.com"],
    ["another port", "https://libreriamisueno.com.ar:8443"],
    ["another scheme", "http://libreriamisueno.com.ar"],
    ["a subdomain", "https://api.libreriamisueno.com.ar"],
    ["a lookalike suffix", "https://libreriamisueno.com.ar.evil.com"],
    ["the opaque origin", "null"],
  ])("rejects %s", (_label, origin) => {
    rejects({ origin });
  });

  it("prefers Origin over Referer", () => {
    rejects({ origin: "https://evil.example.com", referer: `${FRONTEND}/panel` });
  });

  it("falls back to the origin of Referer without Origin", () => {
    allows({ referer: `${FRONTEND}/panel/productos?page=2#top` });
  });

  it("rejects a foreign Referer without Origin", () => {
    rejects({ referer: "https://evil.example.com/libreriamisueno.com.ar" });
  });

  it("rejects a Referer that is not a URL", () => {
    rejects({ referer: "not a url" });
  });

  it("rejects a request without Origin or Referer", () => {
    rejects({});
  });

  it("rejects a repeated Origin, which Node joins into a single value", () => {
    rejects({ origin: `${FRONTEND}, ${FRONTEND}` });
  });

  it("ignores a trailing slash or path in FRONTEND_URL", () => {
    allows({ origin: FRONTEND }, guardFor(`${FRONTEND}/`));
    allows({ origin: FRONTEND }, guardFor(`${FRONTEND}/panel`));
  });

  it("rejects with a stable code and a user-facing message", () => {
    expect(() => guardFor().canActivate(contextWith({}))).toThrow(
      expect.objectContaining({
        code: "ORIGIN_NOT_ALLOWED",
        message: "No se pudo verificar el origen de la solicitud.",
      }),
    );
  });
});
