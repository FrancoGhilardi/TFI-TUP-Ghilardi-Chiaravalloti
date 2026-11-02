import type { Password } from "../../domain/value-objects/password.js";

/**
 * Hashes passwords and checks them against a stored hash. Hashing takes a `Password`, so
 * nothing can be stored without meeting the password policy; checking takes the text as
 * typed, since a login only compares it.
 */
export abstract class PasswordHasher {
  abstract hash(password: Password): Promise<string>;
  abstract verify(hash: string, plain: string): Promise<boolean>;
}
