import { describe, expect, it } from "vitest";

import { PRODUCT_NOT_FOUND_METADATA, productMetadata } from "./product-metadata";
import type { ProductDetail } from "./product-detail";

const product = (overrides: Partial<ProductDetail> = {}): ProductDetail => ({
  id: "1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  description: "Tapa dura y hojas rayadas.",
  price: "9800.00",
  salePrice: null,
  isOnSale: false,
  stock: 5,
  images: [{ id: "i1", url: "https://x/y.webp", alt: "Tapa", optimizable: true }],
  category: { name: "Cuadernos", slug: "cuadernos" },
  related: [],
  ...overrides,
});

describe("productMetadata", () => {
  it("uses the title, the description, the page and the first image", () => {
    const metadata = productMetadata(product());

    expect(metadata.title).toBe("Cuaderno A4");
    expect(metadata.description).toBe("Tapa dura y hojas rayadas.");
    expect(metadata.alternates).toEqual({ canonical: "/productos/cuaderno-a4" });
    expect(metadata.openGraph).toMatchObject({
      images: [{ url: "https://x/y.webp", alt: "Tapa" }],
    });
    expect(metadata.robots).toBeUndefined();
  });

  it("shortens a long description", () => {
    const metadata = productMetadata(product({ description: "palabra ".repeat(60) }));

    expect((metadata.description ?? "").length).toBeLessThanOrEqual(160);
    expect(metadata.description).toMatch(/…$/);
  });

  it.each([null, "", "   "])(
    "describes a product with no description (%j) by its category",
    (description) => {
      expect(productMetadata(product({ description })).description).toBe(
        "Cuaderno A4 en Cuadernos. Reservá por WhatsApp y retirá en el local.",
      );
    },
  );

  it("describes it without a category when it is hidden", () => {
    expect(productMetadata(product({ description: null, category: null })).description).toBe(
      "Cuaderno A4. Reservá por WhatsApp y retirá en el local.",
    );
  });

  it("keeps a product that is not in the store out of the index", () => {
    expect(PRODUCT_NOT_FOUND_METADATA.robots).toEqual({ index: false });
  });
});
