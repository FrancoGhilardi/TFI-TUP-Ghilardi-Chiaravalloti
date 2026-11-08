import { describe, expect, it } from "vitest";

import { EMPTY_PRODUCT_FORM, type ProductFormValues } from "./product-form";
import { hasChanges, toCreateRequest, toUpdateRequest } from "./product-request";

const ARGENTINA = () => -180;

const file = (name: string) => new File(["x"], name, { type: "image/png" });

const base = (overrides: Partial<ProductFormValues> = {}): ProductFormValues => ({
  ...EMPTY_PRODUCT_FORM,
  title: "Cuaderno rayado",
  price: "1500",
  stock: "10",
  categoryIds: ["c1"],
  primaryCategoryId: "c1",
  ...overrides,
});

describe("toCreateRequest", () => {
  it("builds the minimum the API asks for, with no optional field", () => {
    expect(
      toCreateRequest(
        base({ images: [{ key: "k", file: file("a.png"), altText: "" }] }),
        ARGENTINA,
      ),
    ).toEqual({
      title: "Cuaderno rayado",
      price: "1500.00",
      stock: 10,
      sortOrder: 0,
      isActive: true,
      isFeatured: false,
      isOnSale: false,
      isNew: false,
      categoryIds: ["c1"],
      primaryCategoryId: "c1",
      imageAltTexts: [""],
    });
  });

  it("trims the title and the description, and leaves a blank description out", () => {
    const request = toCreateRequest(
      base({ title: "  Cuaderno ", description: "  Tapa dura  " }),
      ARGENTINA,
    );
    const blank = toCreateRequest(base({ description: "   " }), ARGENTINA);

    expect(request).toMatchObject({ title: "Cuaderno", description: "Tapa dura" });
    expect(blank).not.toHaveProperty("description");
  });

  it("writes the prices as decimal text with a dot", () => {
    expect(
      toCreateRequest(base({ price: "1500,5", isOnSale: true, salePrice: "1200" }), ARGENTINA),
    ).toMatchObject({
      price: "1500.50",
      salePrice: "1200.00",
    });
  });

  it("sends the offer with its end as the last minute of the day in the person's zone", () => {
    const request = toCreateRequest(
      base({ isOnSale: true, salePrice: "1200", saleEndsAt: "2026-12-31" }),
      ARGENTINA,
    );

    expect(request).toMatchObject({
      isOnSale: true,
      salePrice: "1200.00",
      saleEndsAt: "2026-12-31T23:59:00-03:00",
    });
  });

  it("leaves the offer's fields out when the offer is off, even if they were typed", () => {
    const request = toCreateRequest(
      base({ isOnSale: false, salePrice: "1200", saleEndsAt: "2026-12-31" }),
      ARGENTINA,
    );

    expect(request.isOnSale).toBe(false);
    expect(request).not.toHaveProperty("salePrice");
    expect(request).not.toHaveProperty("saleEndsAt");
  });

  it("does the same with the new mark", () => {
    const on = toCreateRequest(base({ isNew: true, newUntil: "2026-12-31" }), ARGENTINA);
    const noDay = toCreateRequest(base({ isNew: true }), ARGENTINA);
    const off = toCreateRequest(base({ isNew: false, newUntil: "2026-12-31" }), ARGENTINA);

    expect(on).toMatchObject({ isNew: true, newUntil: "2026-12-31T23:59:00-03:00" });
    expect(noDay).toMatchObject({ isNew: true });
    expect(noDay).not.toHaveProperty("newUntil");
    expect(off).toMatchObject({ isNew: false });
    expect(off).not.toHaveProperty("newUntil");
  });

  it("sends the categories with the primary one, and the related products in their order, in lowercase", () => {
    const request = toCreateRequest(
      base({
        categoryIds: ["AAA", "BBB"],
        primaryCategoryId: "BBB",
        relatedProducts: [
          { id: "P2", title: "x", sku: "s" },
          { id: "P1", title: "y", sku: "t" },
        ],
      }),
      ARGENTINA,
    );

    expect(request).toMatchObject({
      categoryIds: ["aaa", "bbb"],
      primaryCategoryId: "bbb",
      relatedProductIds: ["p2", "p1"],
    });
  });

  it("leaves related products out when there are none", () => {
    expect(toCreateRequest(base(), ARGENTINA)).not.toHaveProperty("relatedProductIds");
  });

  it("gives an alternative text per image, in the order of the images", () => {
    const request = toCreateRequest(
      base({
        images: [
          { key: "1", file: file("a.png"), altText: " Tapa " },
          { key: "2", file: file("b.png"), altText: "" },
        ],
      }),
      ARGENTINA,
    );

    expect(request.imageAltTexts).toEqual(["Tapa", ""]);
  });
});

describe("toUpdateRequest", () => {
  const initial = base({
    description: "Tapa dura",
    isOnSale: true,
    salePrice: "1200",
    saleEndsAt: "2026-12-31",
    isNew: true,
    newUntil: "2027-01-31",
    categoryIds: ["c1", "c2"],
    primaryCategoryId: "c1",
    relatedProducts: [
      { id: "p1", title: "A", sku: "s1" },
      { id: "p2", title: "B", sku: "s2" },
    ],
  });
  const update = (overrides: Partial<ProductFormValues>) =>
    toUpdateRequest({ ...initial, ...overrides }, initial, ARGENTINA);

  it("is empty when nothing changed", () => {
    expect(update({})).toEqual({});
    expect(hasChanges(initial, initial, ARGENTINA)).toBe(false);
  });

  it("ignores changes that only reword the same value", () => {
    expect(
      update({ price: "1500,00", stock: "010", title: " Cuaderno rayado ", salePrice: "1200,0" }),
    ).toEqual({});
  });

  it("sends each simple field on its own", () => {
    expect(update({ title: "Otro" })).toEqual({ title: "Otro" });
    expect(update({ price: "1600" })).toEqual({ price: "1600.00" });
    expect(update({ stock: "3" })).toEqual({ stock: 3 });
    expect(update({ sortOrder: "4" })).toEqual({ sortOrder: 4 });
    expect(update({ isActive: false })).toEqual({ isActive: false });
    expect(update({ isFeatured: true })).toEqual({ isFeatured: true });
  });

  it("sends an emptied description as an empty text, never as null", () => {
    expect(update({ description: "" })).toEqual({ description: "" });
    expect(update({ description: "   " })).toEqual({ description: "" });
  });

  it("sends the whole offer when any of its fields change", () => {
    const expected = {
      isOnSale: true,
      salePrice: "1100.00",
      saleEndsAt: "2026-12-31T23:59:00-03:00",
    };

    expect(update({ salePrice: "1100" })).toEqual(expected);
    expect(update({ saleEndsAt: "2027-02-01" })).toEqual({
      ...expected,
      salePrice: "1200.00",
      saleEndsAt: "2027-02-01T23:59:00-03:00",
    });
  });

  it("sends the offer without an end when the end was removed", () => {
    expect(update({ saleEndsAt: "" })).toEqual({ isOnSale: true, salePrice: "1200.00" });
  });

  it("sends only that the offer is off, nothing else of it, when it is turned off", () => {
    expect(update({ isOnSale: false })).toEqual({ isOnSale: false });
    expect(update({ isOnSale: false, salePrice: "999", saleEndsAt: "2030-01-01" })).toEqual({
      isOnSale: false,
    });
  });

  it("turns an offer on with its fields when it was off", () => {
    const off = base();

    expect(
      toUpdateRequest(
        base({ isOnSale: true, salePrice: "1000", saleEndsAt: "2027-01-01" }),
        off,
        ARGENTINA,
      ),
    ).toEqual({ isOnSale: true, salePrice: "1000.00", saleEndsAt: "2027-01-01T23:59:00-03:00" });
  });

  it("treats the new mark the same way", () => {
    expect(update({ newUntil: "2027-03-01" })).toEqual({
      isNew: true,
      newUntil: "2027-03-01T23:59:00-03:00",
    });
    expect(update({ isNew: false })).toEqual({ isNew: false });
  });

  it("sends the categories as a pair when either part changes", () => {
    expect(update({ primaryCategoryId: "c2" })).toEqual({
      categoryIds: ["c1", "c2"],
      primaryCategoryId: "c2",
    });
    expect(update({ categoryIds: ["c1", "c2", "c3"] })).toEqual({
      categoryIds: ["c1", "c2", "c3"],
      primaryCategoryId: "c1",
    });
  });

  it("sends the related products whole when they or their order change, and an empty list when removed", () => {
    expect(
      update({
        relatedProducts: [
          { id: "p2", title: "B", sku: "s2" },
          { id: "p1", title: "A", sku: "s1" },
        ],
      }),
    ).toEqual({ relatedProductIds: ["p2", "p1"] });
    expect(update({ relatedProducts: [] })).toEqual({ relatedProductIds: [] });
  });

  it("reports changes", () => {
    expect(hasChanges({ ...initial, stock: "99" }, initial, ARGENTINA)).toBe(true);
  });
});
