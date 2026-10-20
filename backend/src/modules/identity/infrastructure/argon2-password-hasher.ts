import { Injectable } from "@nestjs/common";
import argon2 from "argon2";
import { PasswordHasher } from "../application/ports/password-hasher.js";
import type { Password } from "../domain/value-objects/password.js";

/** Argon2id implementation with a random salt per hash. */
@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  hash(password: Password): Promise<string> {
    return argon2.hash(password.reveal(), { type: argon2.argon2id });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
