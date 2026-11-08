import { describe, expect, it } from "vitest";

import type { AdminProductRow } from "./admin-product";
import { productState } from "./product-state";

const row = (overrides: Partial<AdminProductRow>): AdminProductRow => ({
  id: "p1",
  sku: "LMS-000001",
  title: "Cuaderno",
  slug: "cuaderno",
  stock: 3,
  isActive: true,
  thumbnailUrl: null,
  updatedAt: new Date(),
  price: "1500.00",
  salePrice: null,
  isFeatured: false,
  isNew: false,
  isOnSale: false,
  primaryCategory: null,
  deletedAt: null,
  ...overrides,
});

describe("productState", () => {
  it("is active for a product that is shown", () => {
    expect(productState(row({}))).toBe("active");
  });

  it("is inactive for one that is hidden", () => {
    expect(productState(row({ isActive: false }))).toBe("inactive");
  });

  it("is deleted whatever the active flag says", () => {
    expect(productState(row({ deletedAt: new Date() }))).toBe("deleted");
    expect(productState(row({ deletedAt: new Date(), isActive: false }))).toBe("deleted");
  });
});
