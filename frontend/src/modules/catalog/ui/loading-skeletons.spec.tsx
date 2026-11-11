import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CatalogSkeleton } from "./CatalogSkeleton";
import { ProductDetailSkeleton } from "./ProductDetailSkeleton";

describe.each([
  ["CatalogSkeleton", <CatalogSkeleton key="catalog" />, "Cargando productos"],
  ["ProductDetailSkeleton", <ProductDetailSkeleton key="product" />, "Cargando el producto"],
])("%s", (_name, element, label) => {
  it("is a busy region that says what is loading, with grey blocks hidden from assistive technology", () => {
    const { container } = render(element);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent(label);
    const blocks = container.querySelectorAll(".animate-pulse");
    expect(blocks.length).toBeGreaterThan(2);
    for (const block of blocks) {
      expect(block).toHaveAttribute("aria-hidden", "true");
    }
  });
});
