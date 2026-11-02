import { describe, expect, it } from "vitest";

import { formatPrice } from "./price";

// Intl keeps the sign and the amount together with a non-breaking space.
const NBSP = String.fromCharCode(0xa0);

describe("formatPrice", () => {
  it.each([
    ["24900.00", `$${NBSP}24.900`],
    ["1500.50", `$${NBSP}1.500,50`],
    ["1234567.89", `$${NBSP}1.234.567,89`],
    ["0.00", `$${NBSP}0`],
    ["9.05", `$${NBSP}9,05`],
  ])("formats %s as %s", (decimal, text) => {
    expect(formatPrice(decimal)).toBe(text);
  });

  it.each(["", "1.500,50", "abc", "-10.00", "10.123"])("rejects %j", (decimal) => {
    expect(() => formatPrice(decimal)).toThrow(TypeError);
  });
});
