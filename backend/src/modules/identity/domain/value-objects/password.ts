import { InvalidPasswordError } from "../errors/invalid-password-error.js";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./password-policy.js";

const REDACTED = "[REDACTED]";

const isLoneSurrogate = (codePoint: string) => {
  const value = codePoint.codePointAt(0) ?? 0;
  return value >= 0xd800 && value <= 0xdfff;
};

/**
 * A plain-text password that meets the password policy; it can only be created through
 * `create`, so every password that gets hashed was checked first. The text lives in a
 * JavaScript private field and is only read with `reveal`, so logging or serializing the
 * object by mistake does not expose it.
 */
export class Password {
  static readonly MIN_LENGTH = PASSWORD_MIN_LENGTH;
  static readonly MAX_LENGTH = PASSWORD_MAX_LENGTH;

  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
  }

  /**
   * Counts Unicode code points: a simple emoji or a precomposed accented letter is one,
   * while a decomposed letter or a joined emoji counts as several. The text is kept as
   * typed, with no trimming or normalization, since both would change the password.
   */
  static create(plain: string): Password {
    const codePoints = [...plain];
    // A lone surrogate is not valid Unicode: once encoded for hashing it becomes U+FFFD,
    // so different passwords would end up with the same hash.
    if (codePoints.some(isLoneSurrogate)) {
      throw new InvalidPasswordError("characters");
    }
    if (codePoints.length < Password.MIN_LENGTH || codePoints.length > Password.MAX_LENGTH) {
      throw new InvalidPasswordError("length");
    }
    return new Password(plain);
  }

  reveal(): string {
    return this.#value;
  }

  toString(): string {
    return REDACTED;
  }

  toJSON(): string {
    return REDACTED;
  }
}
