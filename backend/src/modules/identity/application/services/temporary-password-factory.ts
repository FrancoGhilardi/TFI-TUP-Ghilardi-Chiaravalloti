import { Password } from "../../domain/value-objects/password.js";
import type { PasswordHasher } from "../ports/password-hasher.js";
import type { TemporaryPasswordGenerator } from "../ports/temporary-password-generator.js";

/** A generated temporary password: the text to mail and the hash to store. */
export interface GeneratedTemporaryPassword {
  plain: string;
  hash: string;
}

/** Generates a temporary password, checked against the password policy, and its hash. */
export class TemporaryPasswordFactory {
  constructor(
    private readonly generator: TemporaryPasswordGenerator,
    private readonly hasher: PasswordHasher,
  ) {}

  async create(): Promise<GeneratedTemporaryPassword> {
    const plain = this.generator.generate();
    return { plain, hash: await this.hasher.hash(Password.create(plain)) };
  }
}
