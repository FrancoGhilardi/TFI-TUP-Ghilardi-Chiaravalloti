import { describe, expect, it } from "vitest";

import { productHref } from "./product-routes";

describe("productHref", () => {
  it("links a product page by slug", () => {
    expect(productHref("cuaderno-a4")).toBe("/productos/cuaderno-a4");
  });
});
