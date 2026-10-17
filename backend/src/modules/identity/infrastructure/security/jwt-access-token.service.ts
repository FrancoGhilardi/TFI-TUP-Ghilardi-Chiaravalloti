import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Env } from "../../../../config/env.js";
import {
  type AccessToken,
  AccessTokenService,
} from "../../application/ports/access-token-service.js";
import type { User } from "../../domain/entities/user.js";

/**
 * Signs access tokens with HS256. They carry only the user id: role and status are read
 * from the database on every request, so a change to the user applies immediately.
 */
@Injectable()
export class JwtAccessTokenService extends AccessTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {
    super();
  }

  issue(user: User): AccessToken {
    const expiresInSeconds = this.config.get("JWT_ACCESS_TTL_SECONDS", { infer: true });
    const token = this.jwt.sign(
      { sub: user.getId() },
      {
        secret: this.config.get("JWT_ACCESS_SECRET", { infer: true }),
        algorithm: "HS256",
        expiresIn: expiresInSeconds,
      },
    );
    return { token, expiresInSeconds };
  }
}
