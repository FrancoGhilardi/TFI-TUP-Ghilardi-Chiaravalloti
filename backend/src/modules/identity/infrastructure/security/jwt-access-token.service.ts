import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Env } from "../../../../config/env.js";
import { Clock } from "../../../../shared/application/clock.js";
import { InvalidAccessTokenError } from "../../application/errors/invalid-access-token-error.js";
import {
  type AccessToken,
  type AccessTokenClaims,
  AccessTokenService,
} from "../../application/ports/access-token-service.js";
import type { User } from "../../domain/entities/user.js";

const ALGORITHM = "HS256";
// User ids are uuids; anything else would fail in the database instead of as a bad token.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Signs and verifies access tokens with HS256. They carry only the user id: role and status
 * are read from the database on every request, so a change to the user applies immediately.
 */
@Injectable()
export class JwtAccessTokenService extends AccessTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly clock: Clock,
  ) {
    super();
  }

  issue(user: User): AccessToken {
    const expiresInSeconds = this.config.get("JWT_ACCESS_TTL_SECONDS", { infer: true });
    // Stamped with the same clock that records password changes, so a token issued right
    // after one is never older than it.
    const token = this.jwt.sign(
      { sub: user.getId(), iat: this.nowInSeconds() },
      { secret: this.secret(), algorithm: ALGORITHM, expiresIn: expiresInSeconds },
    );
    return { token, expiresInSeconds };
  }

  verify(token: string): AccessTokenClaims {
    let payload: Record<string, unknown>;
    try {
      // Only HS256 is accepted, so an unsigned token or another algorithm never passes;
      // with no clock tolerance the token expires exactly at `exp`.
      payload = this.jwt.verify<Record<string, unknown>>(token, {
        secret: this.secret(),
        algorithms: [ALGORITHM],
        clockTimestamp: this.nowInSeconds(),
      });
    } catch {
      throw new InvalidAccessTokenError();
    }

    const { sub, iat, exp } = payload;
    if (
      typeof sub !== "string" ||
      !UUID_PATTERN.test(sub) ||
      typeof iat !== "number" ||
      typeof exp !== "number"
    ) {
      throw new InvalidAccessTokenError();
    }
    return { userId: sub, issuedAt: new Date(iat * 1000) };
  }

  private nowInSeconds(): number {
    return Math.floor(this.clock.now().getTime() / 1000);
  }

  private secret(): string {
    return this.config.get("JWT_ACCESS_SECRET", { infer: true });
  }
}
