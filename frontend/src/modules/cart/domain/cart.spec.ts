import { describe, expect, it } from "vitest";

import {
  addToCart,
  type CartItem,
  type CartProduct,
  cartCount,
  cartTotal,
  lineSubtotal,
  removeItem,
  setQuantity,
  syncProduct,
} from "./cart";

const product = (overrides: Partial<CartProduct> = {}): CartProduct => ({
  id: "p1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  price: "9800.00",
  stock: 5,
  imageUrl: "http://x/p1.webp",
  ...overrides,
});

const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  ...product(),
  quantity: 2,
  ...overrides,
});

describe("addToCart", () => {
  it("adds a product that is not in the cart", () => {
    expect(addToCart([], product(), 3)).toEqual({ items: [item({ quantity: 3 })], added: 3 });
  });

  it("adds to the quantity of a product that is already there, in its place", () => {
    const other = item({ id: "p2", slug: "otro" });

    const result = addToCart([item(), other], product(), 2);

    expect(result.items).toEqual([item({ quantity: 4 }), other]);
    expect(result.added).toBe(2);
  });

  it("never holds more than the stock, adding only what fits", () => {
    const result = addToCart([item({ quantity: 4 })], product({ stock: 5 }), 3);

    expect(result.items[0].quantity).toBe(5);
    expect(result.added).toBe(1);
  });

  it("adds nothing once the stock is reached", () => {
    const items = [item({ quantity: 5 })];

    const result = addToCart(items, product({ stock: 5 }), 1);

    expect(result.added).toBe(0);
    expect(result.items).toBe(items);
  });

  it.each([0, -3])("adds nothing to a product with %i in stock", (stock) => {
    expect(addToCart([], product({ stock }), 1)).toEqual({ items: [], added: 0 });
  });

  it("caps a new product at its stock", () => {
    expect(addToCart([], product({ stock: 2 }), 10)).toEqual({
      items: [item({ stock: 2, quantity: 2 })],
      added: 2,
    });
  });

  it("replaces the old copy with the product as it looks now", () => {
    const result = addToCart([item({ price: "9000.00", quantity: 1 })], product(), 1);

    expect(result.items[0]).toMatchObject({ price: "9800.00", quantity: 2 });
  });
});

describe("syncProduct", () => {
  it("leaves the cart alone for a product that is not in it", () => {
    const items = [item({ id: "p2" })];

    expect(syncProduct(items, product())).toEqual({ items, notice: null });
  });

  it("refreshes the copy without a notice when the quantity still fits", () => {
    const result = syncProduct(
      [item({ quantity: 2 })],
      product({
        price: "10500.00",
        stock: 9,
        title: "Cuaderno A4 nuevo",
        imageUrl: "http://x/n.webp",
      }),
    );

    expect(result.items).toEqual([
      {
        ...product({
          price: "10500.00",
          stock: 9,
          title: "Cuaderno A4 nuevo",
          imageUrl: "http://x/n.webp",
        }),
        quantity: 2,
      },
    ]);
    expect(result.notice).toBeNull();
  });

  it("lowers the quantity to the stock and says so", () => {
    const result = syncProduct([item({ quantity: 4 })], product({ stock: 2 }));

    expect(result.items[0].quantity).toBe(2);
    expect(result.notice).toEqual({
      kind: "adjusted",
      productId: "p1",
      title: "Cuaderno A4",
      quantity: 2,
    });
  });

  it("takes the product out when there is no stock and says so", () => {
    const keep = item({ id: "p2" });

    const result = syncProduct([item(), keep], product({ stock: 0 }));

    expect(result.items).toEqual([keep]);
    expect(result.notice).toEqual({ kind: "removed", productId: "p1", title: "Cuaderno A4" });
  });

  it("does not warn when the quantity equals the stock", () => {
    expect(syncProduct([item({ quantity: 5 })], product({ stock: 5 })).notice).toBeNull();
  });
});

describe("cartCount", () => {
  it("sums the units of every product", () => {
    expect(cartCount([])).toBe(0);
    expect(cartCount([item({ quantity: 2 }), item({ id: "p2", quantity: 3 })])).toBe(5);
  });
});

describe("setQuantity", () => {
  it("sets the quantity of a product in its place", () => {
    const other = item({ id: "p2", slug: "otro" });

    expect(setQuantity([item(), other], "p1", 4)).toEqual([item({ quantity: 4 }), other]);
  });

  it("never goes above the stock", () => {
    expect(setQuantity([item({ stock: 3 })], "p1", 10)).toEqual([item({ stock: 3, quantity: 3 })]);
  });

  it("takes the product out at zero or below", () => {
    expect(setQuantity([item()], "p1", 0)).toEqual([]);
    expect(setQuantity([item()], "p1", -2)).toEqual([]);
  });

  it("leaves the cart as it is for an unknown product or the same quantity", () => {
    const items = [item()];

    expect(setQuantity(items, "nope", 3)).toBe(items);
    expect(setQuantity(items, "p1", 2)).toBe(items);
  });

  it("ignores a quantity that is not a number", () => {
    const items = [item()];

    expect(setQuantity(items, "p1", Number.NaN)).toBe(items);
  });
});

describe("removeItem", () => {
  it("takes one product out and keeps the rest", () => {
    const other = item({ id: "p2", slug: "otro" });

    expect(removeItem([item(), other], "p1")).toEqual([other]);
  });
});

describe("lineSubtotal and cartTotal", () => {
  it("multiplies the price by the quantity", () => {
    expect(lineSubtotal(item({ price: "9800.00", quantity: 2 }))).toBe("19600.00");
  });

  it("adds the lines without floating point drift", () => {
    const items = [
      item({ price: "0.10", quantity: 3 }),
      item({ id: "p2", price: "1500.50", quantity: 2 }),
    ];

    expect(cartTotal(items)).toBe("3001.30");
  });

  it("is zero for an empty cart", () => {
    expect(cartTotal([])).toBe("0.00");
  });
});
