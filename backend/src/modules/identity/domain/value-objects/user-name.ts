import { InvalidUserNameError } from "../errors/invalid-user-name-error.js";
import { USER_NAME_MAX_LENGTH } from "./user-name-policy.js";

/** The name shown for a panel user: trimmed, never blank and within the column length. */
export class UserName {
  static readonly MAX_LENGTH = USER_NAME_MAX_LENGTH;

  private constructor(private readonly value: string) {}

  static create(value: string): UserName {
    const trimmed = value.trim();
    // Counted in code points, like the length of a Postgres varchar.
    const length = [...trimmed].length;
    if (length === 0 || length > UserName.MAX_LENGTH) {
      throw new InvalidUserNameError();
    }
    return new UserName(trimmed);
  }

  /** Rebuilds a name already validated when it was stored, without checking it again. */
  static fromPersisted(value: string): UserName {
    return new UserName(value);
  }

  equals(other: UserName): boolean {
    return other.value === this.value;
  }

  toString(): string {
    return this.value;
  }
}
