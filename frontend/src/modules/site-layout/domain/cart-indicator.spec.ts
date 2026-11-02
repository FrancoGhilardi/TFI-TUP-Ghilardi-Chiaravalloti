import { describe, expect, it } from "vitest";

import { cartBadgeText, cartButtonLabel } from "./cart-indicator";

describe("cartBadgeText", () => {
  it.each([
    [0, null],
    [1, "1"],
    [9, "9"],
    [10, "9+"],
    [42, "9+"],
  ])("for %i shows %s", (count, text) => {
    expect(cartBadgeText(count)).toBe(text);
  });
});

describe("cartButtonLabel", () => {
  it.each([
    [0, "Abrir carrito"],
    [1, "Abrir carrito, 1 producto"],
    [12, "Abrir carrito, 12 productos"],
  ])("for %i says %s", (count, label) => {
    expect(cartButtonLabel(count)).toBe(label);
  });
});
