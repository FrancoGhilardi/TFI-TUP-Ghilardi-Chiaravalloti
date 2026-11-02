import { InvalidEmailError } from "../domain/errors/invalid-email-error.js";
import { Email } from "../domain/value-objects/email.js";

/** For the flows that answer a malformed email exactly like an unknown one. */
export function parseEmail(value: string): Email | null {
  try {
    return Email.create(value);
  } catch (error) {
    if (error instanceof InvalidEmailError) {
      return null;
    }
    throw error;
  }
}
