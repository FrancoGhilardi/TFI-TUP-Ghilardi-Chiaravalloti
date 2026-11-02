import { Injectable } from "@nestjs/common";
import argon2 from "argon2";
import { PasswordHasher } from "../application/ports/password-hasher.js";

/** Argon2id implementation with a random salt per hash. */
@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
