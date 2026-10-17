import { InvalidEmailError } from "../errors/invalid-email-error.js";

// Same rule as the chk_users_email_format constraint, so both layers accept the same values.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** A valid email address, stored in lowercase to avoid duplicates that only differ in case. */
export class Email {
  private constructor(private readonly value: string) {}

  static create(value: string): Email {
    if (!EMAIL_PATTERN.test(value)) {
      throw new InvalidEmailError();
    }
    return new Email(value.toLowerCase());
  }

  /**
   * Rebuilds an email already validated when it was stored, without checking it again.
   * It is still lowercased, since rows written outside the app may keep their case.
   */
  static fromPersisted(value: string): Email {
    return new Email(value.toLowerCase());
  }

  toString(): string {
    return this.value;
  }
}
