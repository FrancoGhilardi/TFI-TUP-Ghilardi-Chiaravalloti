import { InvalidMoneyError } from "../errors/invalid-money-error.js";

// numeric(12, 2): up to 10 integer digits and 2 decimals, as cents.
const MAX_CENTS = 999_999_999_999;
const DECIMAL = /^(\d{1,10})(?:\.(\d{1,2}))?$/;

/**
 * An amount of pesos, kept as whole cents so adding and comparing never suffer from binary
 * fractions. Never negative; whether zero is allowed depends on what the amount is for.
 */
export class Money {
  private constructor(private readonly cents: number) {}

  /** From text such as "1234", "1234.5" or "1234.50": digits, a dot and up to 2 decimals. */
  static fromDecimal(value: string): Money {
    const match = DECIMAL.exec(value);
    if (!match) {
      throw new InvalidMoneyError();
    }
    const [, units, decimals = ""] = match;
    return Money.fromCents(Number(units) * 100 + Number(decimals.padEnd(2, "0")));
  }

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents) || cents < 0 || cents > MAX_CENTS) {
      throw new InvalidMoneyError();
    }
    return new Money(cents);
  }

  toCents(): number {
    return this.cents;
  }

  /** Always with two decimals, as the database column stores it: "1234.50". */
  toDecimalString(): string {
    const units = Math.floor(this.cents / 100);
    const decimals = String(this.cents % 100).padStart(2, "0");
    return `${units}.${decimals}`;
  }

  toNumber(): number {
    return this.cents / 100;
  }

  isPositive(): boolean {
    return this.cents > 0;
  }

  isLessThan(other: Money): boolean {
    return this.cents < other.cents;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }
}
