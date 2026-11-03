import { describe, expect, it } from "vitest";

import type { ProductDetail } from "./product-detail";
import { productBreadcrumb } from "./product-breadcrumb";
import { productPageUrl } from "./product-detail";

const product = (overrides: Partial<ProductDetail> = {}): ProductDetail => ({
  id: "p1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  description: null,
  price: "9800.00",
  salePrice: null,
  isOnSale: false,
  stock: 10,
  images: [{ id: "i1", url: "http://x/i1.webp", alt: "Cuaderno A4", optimizable: true }],
  category: { name: "Cuadernos", slug: "cuadernos" },
  related: [],
  ...overrides,
});

describe("productPageUrl", () => {
  it("builds the absolute address from the site origin, encoding the slug", () => {
    expect(productPageUrl("http://localhost:3000", "cuaderno-a4")).toBe(
      "http://localhost:3000/productos/cuaderno-a4",
    );
  });
});

describe("productBreadcrumb", () => {
  it("goes from the home to the category and ends on the product, with no link", () => {
    expect(productBreadcrumb(product())).toEqual([
      { label: "Inicio", href: "/" },
      { label: "Cuadernos", href: "/productos?categoria=cuadernos" },
      { label: "Cuaderno A4" },
    ]);
  });

  it("points to the catalog while the primary category is hidden", () => {
    expect(productBreadcrumb(product({ category: null }))[1]).toEqual({
      label: "Productos",
      href: "/productos",
    });
  });
});
