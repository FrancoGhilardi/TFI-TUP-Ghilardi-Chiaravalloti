import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { RefreshTokenService } from "../../application/ports/refresh-token-service.js";

const TOKEN_BYTES = 32;

/**
 * Random 32-byte tokens, hashed with SHA-256. Unlike passwords they need no slow hash: they
 * are random and long enough that guessing one is not feasible.
 */
@Injectable()
export class Sha256RefreshTokenService extends RefreshTokenService {
  generate(): string {
    return randomBytes(TOKEN_BYTES).toString("base64url");
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
