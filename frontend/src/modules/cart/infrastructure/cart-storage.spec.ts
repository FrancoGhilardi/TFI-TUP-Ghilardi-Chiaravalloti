import { describe, expect, it } from "vitest";

import { CART_STORAGE_KEY, restoreItems } from "./cart-storage";

const stored = (overrides: Record<string, unknown> = {}) => ({
  id: "p1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  price: "9800.00",
  stock: 5,
  imageUrl: "http://x/p1.webp",
  quantity: 2,
  ...overrides,
});

describe("restoreItems", () => {
  it("is versioned in its key", () => {
    expect(CART_STORAGE_KEY).toBe("lms-cart-v1");
  });

  it("restores valid items", () => {
    expect(restoreItems([stored(), stored({ id: "p2", slug: "otro" })])).toHaveLength(2);
  });

  it.each([undefined, null, "carrito", 3, {}, { items: [] }])(
    "restores nothing from %j",
    (value) => {
      expect(restoreItems(value)).toEqual([]);
    },
  );

  it.each([
    ["no quantity", { quantity: undefined }],
    ["a zero quantity", { quantity: 0 }],
    ["a fractional quantity", { quantity: 1.5 }],
    ["a negative stock", { stock: -1 }],
    ["a malformed price", { price: "9.800,00" }],
    ["a blank title", { title: "" }],
    ["a numeric id", { id: 7 }],
  ])("drops an item with %s and keeps the rest", (_name, overrides) => {
    const kept = stored({ id: "ok", slug: "ok" });

    expect(restoreItems([stored(overrides), kept])).toEqual([kept]);
  });

  it("keeps the first of a repeated product", () => {
    const [first] = restoreItems([stored({ quantity: 1 }), stored({ quantity: 4 })]);

    expect(first.quantity).toBe(1);
  });

  it("holds the quantity to the stock", () => {
    expect(restoreItems([stored({ stock: 2, quantity: 50 })])[0].quantity).toBe(2);
  });

  it("leaves out a product with no stock", () => {
    const kept = stored({ id: "ok", slug: "ok" });

    expect(restoreItems([stored({ stock: 0, quantity: 1 }), kept])).toEqual([kept]);
  });
});
