import { InvalidSkuError } from "../errors/invalid-sku-error.js";

const FORMAT = /^LMS-[0-9]{6,}$/;

/**
 * Internal code of a product, such as LMS-000001. The database generates it from a sequence;
 * it never changes afterwards.
 */
export class Sku {
  private constructor(private readonly value: string) {}

  static fromValue(value: string): Sku {
    if (!FORMAT.test(value)) {
      throw new InvalidSkuError();
    }
    return new Sku(value);
  }

  equals(other: Sku): boolean {
    return other.value === this.value;
  }

  toString(): string {
    return this.value;
  }
}
