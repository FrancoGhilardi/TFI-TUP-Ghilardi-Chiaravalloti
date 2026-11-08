import { describe, expect, it } from "vitest";

import { discountPercent, parsePriceInput, priceToInput } from "./price-input";

describe("parsePriceInput", () => {
  it.each([
    ["1500", "1500.00", 150000],
    ["1500,5", "1500.50", 150050],
    ["1500.50", "1500.50", 150050],
    ["1500,05", "1500.05", 150005],
    ["  12  ", "12.00", 1200],
    ["0,5", "0.50", 50],
    ["007", "7.00", 700],
    ["999999999999", "999999999999.00", 99999999999900],
    ["999999999999,99", "999999999999.99", 99999999999999],
  ])("reads %j as %s", (typed, value, cents) => {
    expect(parsePriceInput(typed)).toEqual({ ok: true, value, cents });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["abc", "format"],
    ["12,345", "format"],
    ["1.500,50", "format"],
    ["1,500.50", "format"],
    ["-5", "format"],
    ["1e3", "format"],
    ["12,", "format"],
    ["0", "zero"],
    ["0,00", "zero"],
    ["1000000000000", "range"],
  ])("refuses %j because of its %s", (typed, reason) => {
    expect(parsePriceInput(typed)).toEqual({ ok: false, reason });
  });
});

describe("priceToInput", () => {
  it.each([
    ["1500.00", "1500"],
    ["1500.50", "1500,50"],
    ["1500.05", "1500,05"],
    ["0.99", "0,99"],
    ["20", "20"],
  ])("shows %s as %s", (decimal, shown) => {
    expect(priceToInput(decimal)).toBe(shown);
  });

  it("gives back what parsePriceInput reads", () => {
    const parsed = parsePriceInput(priceToInput("1500.50"));

    expect(parsed).toMatchObject({ ok: true, value: "1500.50" });
  });
});

describe("discountPercent", () => {
  it.each([
    ["1000", "800", 20],
    ["1500", "1200,50", 20],
    ["100", "99,99", 0],
    ["3", "2", 33],
  ])("takes %s to %s as %i%% off", (price, sale, expected) => {
    expect(discountPercent(price, sale)).toBe(expected);
  });

  it.each([
    ["1000", "1000"],
    ["1000", "1200"],
    ["", "800"],
    ["1000", ""],
    ["abc", "1"],
  ])("says nothing for %j and %j", (price, sale) => {
    expect(discountPercent(price, sale)).toBeUndefined();
  });
});
