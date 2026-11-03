import { describe, expect, it } from "vitest";

import { categoryIconKey } from "./category-icons";
import { currentPrice, hasRunningSale, type ProductCard } from "./product-card";
import { cartProductOfCard } from "./product-detail";

const product = (overrides: Partial<ProductCard> = {}): ProductCard => ({
  id: "1",
  slug: "cuaderno",
  title: "Cuaderno",
  price: "9800.00",
  salePrice: null,
  stock: 5,
  isOnSale: false,
  isNew: false,
  isFeatured: false,
  image: { url: "https://x/y.webp", alt: "Cuaderno", optimizable: true },
  category: null,
  ...overrides,
});

describe("hasRunningSale", () => {
  it("needs both the sale flag and a sale price", () => {
    expect(hasRunningSale(product({ isOnSale: true, salePrice: "8000.00" }))).toBe(true);
    expect(hasRunningSale(product({ isOnSale: true, salePrice: null }))).toBe(false);
    expect(hasRunningSale(product({ isOnSale: false, salePrice: "8000.00" }))).toBe(false);
  });
});

describe("currentPrice", () => {
  it("is the sale price during a sale and the regular one otherwise", () => {
    expect(currentPrice(product({ isOnSale: true, salePrice: "8000.00" }))).toBe("8000.00");
    expect(currentPrice(product({ isOnSale: true, salePrice: null }))).toBe("9800.00");
    expect(currentPrice(product())).toBe("9800.00");
  });
});

describe("categoryIconKey", () => {
  it.each([
    ["libros", "books"],
    ["utiles-escolares", "school"],
    ["cuadernos-y-agendas", "notebooks"],
    ["arte-y-pintura", "art"],
    ["mochilas-y-cartucheras", "backpacks"],
    ["regaleria", "gifts"],
    ["impresiones", "generic"],
  ])("maps %s to %s", (slug, key) => {
    expect(categoryIconKey(slug)).toBe(key);
  });
});

describe("cartProductOfCard", () => {
  it("keeps what the cart needs, with the price the customer pays now", () => {
    expect(cartProductOfCard(product({ isOnSale: true, salePrice: "8000.00", stock: 3 }))).toEqual({
      id: "1",
      slug: "cuaderno",
      title: "Cuaderno",
      price: "8000.00",
      stock: 3,
      imageUrl: "https://x/y.webp",
    });
  });
});
