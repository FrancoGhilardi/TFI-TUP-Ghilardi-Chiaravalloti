import { describe, expect, it } from "vitest";

import { stockStatus } from "./product-stock";

describe("stockStatus", () => {
  it.each([
    [0, { kind: "out" }],
    [-1, { kind: "out" }],
    [1, { kind: "low", units: 1 }],
    [6, { kind: "low", units: 6 }],
    [7, { kind: "in", units: 7 }],
    [120, { kind: "in", units: 120 }],
  ])("reads %i units as %j", (stock, expected) => {
    expect(stockStatus(stock)).toEqual(expected);
  });
});
