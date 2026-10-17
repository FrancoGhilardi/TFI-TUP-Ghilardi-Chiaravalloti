import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../../../config/env.js";
import { OriginNotAllowedError } from "../errors/origin-not-allowed-error.js";

type Headers = Record<string, string | string[] | undefined>;

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/**
 * CSRF defense for the endpoints that read the refresh token cookie: only requests coming
 * from the frontend origin pass. Without `Origin`, the origin of `Referer` is used; with
 * neither, the request is rejected.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowedOrigin: string;

  constructor(config: ConfigService<Env, true>) {
    this.allowedOrigin = new URL(config.get("FRONTEND_URL", { infer: true })).origin;
  }

  canActivate(context: ExecutionContext): boolean {
    const { headers } = context.switchToHttp().getRequest<{ headers: Headers }>();
    const { origin, referer } = headers;

    // Browsers send the literal "null" for opaque origins, which never matches.
    const requestOrigin =
      typeof origin === "string"
        ? origin
        : typeof referer === "string"
          ? originOf(referer)
          : undefined;

    if (requestOrigin !== this.allowedOrigin) {
      throw new OriginNotAllowedError();
    }
    return true;
  }
}
