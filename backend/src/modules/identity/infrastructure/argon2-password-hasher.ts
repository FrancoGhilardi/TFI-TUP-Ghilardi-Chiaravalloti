import { randomBytes } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import argon2 from "argon2";
import { PasswordHasher } from "../application/ports/password-hasher.js";
import type { Password } from "../domain/value-objects/password.js";

const OPTIONS = { type: argon2.argon2id } as const;

/** Argon2id implementation with a random salt per hash. */
@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  private readonly logger = new Logger(Argon2PasswordHasher.name);

  // Hash of a random value nobody knows, built once with the same parameters as real hashes,
  // so checking against it costs the same as checking a real password. It is built up front
  // rather than on first use, which would make that first check slower.
  private readonly decoy = argon2.hash(randomBytes(32).toString("hex"), OPTIONS);

  constructor() {
    super();
    // A failure surfaces when the decoy is used; until then it must not crash the process.
    this.decoy.catch(() => undefined);
  }

  hash(password: Password): Promise<string> {
    return argon2.hash(password.reveal(), OPTIONS);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      // A stored hash Argon2 cannot read (written outside the app) is a failed login like any
      // other, not a server error that would set this account apart.
      this.logger.warn("Stored password hash could not be verified");
      return false;
    }
  }

  async verifyAgainstNothing(plain: string): Promise<false> {
    await argon2.verify(await this.decoy, plain);
    return false;
  }
}
