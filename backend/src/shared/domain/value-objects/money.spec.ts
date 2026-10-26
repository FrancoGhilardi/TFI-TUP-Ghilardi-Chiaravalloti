import { InvalidMoneyError } from "../errors/invalid-money-error.js";
import { InvalidValueError } from "../errors/invalid-value-error.js";
import { Money } from "./money.js";

describe("Money", () => {
  it.each([
    ["1234", 123400],
    ["1234.5", 123450],
    ["1234.05", 123405],
    ["0", 0],
    ["0.99", 99],
    ["9999999999.99", 999_999_999_999],
  ])("reads %s as %i cents", (text, cents) => {
    expect(Money.fromDecimal(text).toCents()).toBe(cents);
  });

  it.each(["", "-1", "+1", "1.234", "1,50", "1e3", " 1", ".5", "1.", "10000000000", "abc"])(
    "rejects %o",
    (text) => {
      expect(() => Money.fromDecimal(text)).toThrow(InvalidMoneyError);
    },
  );

  it.each([-1, 1.5, Number.NaN, 1_000_000_000_000])("rejects %d cents", (cents) => {
    expect(() => Money.fromCents(cents)).toThrow(InvalidMoneyError);
  });

  it("writes two decimals, as the column stores it", () => {
    expect(Money.fromCents(123405).toDecimalString()).toBe("1234.05");
    expect(Money.fromCents(5).toDecimalString()).toBe("0.05");
    expect(Money.fromDecimal("12").toDecimalString()).toBe("12.00");
  });

  it("gives the amount as a number of pesos", () => {
    expect(Money.fromCents(123450).toNumber()).toBe(1234.5);
  });

  it("compares amounts by their cents", () => {
    const low = Money.fromDecimal("10.00");
    const high = Money.fromDecimal("10.01");

    expect(low.isLessThan(high)).toBe(true);
    expect(high.isLessThan(low)).toBe(false);
    expect(low.isLessThan(Money.fromCents(1000))).toBe(false);
    expect(low.equals(Money.fromCents(1000))).toBe(true);
  });

  it("is positive only above zero", () => {
    expect(Money.fromCents(1).isPositive()).toBe(true);
    expect(Money.fromCents(0).isPositive()).toBe(false);
  });

  it("fails as an invalid value, with a message for the user", () => {
    expect(new InvalidMoneyError()).toBeInstanceOf(InvalidValueError);
    expect(new InvalidMoneyError()).toMatchObject({
      code: "INVALID_MONEY",
      message: "El importe tiene que ser un número de hasta 10 cifras enteras y 2 decimales.",
    });
  });
});
