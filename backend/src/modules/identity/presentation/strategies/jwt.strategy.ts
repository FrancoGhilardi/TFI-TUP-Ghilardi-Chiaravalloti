import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Env } from "../../../../config/env.js";
import { InvalidAccessTokenError } from "../../application/errors/invalid-access-token-error.js";
import { ResolveAuthenticatedUserUseCase } from "../../application/use-cases/resolve-authenticated-user.use-case.js";
import type { AuthUser } from "../auth-user.js";

// User ids are uuids; anything else would fail in the database instead of as a bad token.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Verifies the Bearer access token (signature, HS256 only, expiry) and resolves the
 * current user from the database.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly resolveUser: ResolveAuthenticatedUserUseCase,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get("JWT_ACCESS_SECRET", { infer: true }),
      algorithms: ["HS256"],
      ignoreExpiration: false,
    });
  }

  async validate(payload: Record<string, unknown>): Promise<AuthUser> {
    if (
      typeof payload.sub !== "string" ||
      !UUID_PATTERN.test(payload.sub) ||
      typeof payload.iat !== "number"
    ) {
      throw new InvalidAccessTokenError();
    }
    return this.resolveUser.execute({
      userId: payload.sub,
      tokenIssuedAt: new Date(payload.iat * 1000),
    });
  }
}
