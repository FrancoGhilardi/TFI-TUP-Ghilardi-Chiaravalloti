import { describe, expect, it } from "vitest";

import { categoryHref, productHref } from "./product-routes";

describe("catalog routes", () => {
  it("links a product page by slug", () => {
    expect(productHref("cuaderno-a4")).toBe("/productos/cuaderno-a4");
  });

  it("filters the catalog by category slug", () => {
    expect(categoryHref("arte-y-pintura")).toBe("/productos?categoria=arte-y-pintura");
  });
});
