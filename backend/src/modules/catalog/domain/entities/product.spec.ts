import { Money } from "../../../../shared/domain/value-objects/money.js";
import { Slug } from "../../../../shared/domain/value-objects/slug.js";
import { InvalidCategoryAssignmentError } from "../errors/invalid-category-assignment-error.js";
import { InvalidDescriptionError } from "../errors/invalid-description-error.js";
import { InvalidNewUntilError } from "../errors/invalid-new-until-error.js";
import { InvalidPriceError } from "../errors/invalid-price-error.js";
import { InvalidProductTitleError } from "../errors/invalid-product-title-error.js";
import { InvalidSaleEndError } from "../errors/invalid-sale-end-error.js";
import { InvalidSortOrderError } from "../errors/invalid-sort-order-error.js";
import { InvalidStockError } from "../errors/invalid-stock-error.js";
import { ProductDeletedError } from "../errors/product-deleted-error.js";
import { ProductNotDeletedError } from "../errors/product-not-deleted-error.js";
import { SalePriceNotLowerError } from "../errors/sale-price-not-lower-error.js";
import { SelfRelatedProductError } from "../errors/self-related-product-error.js";
import { CategoryAssignment } from "../value-objects/category-assignment.js";
import { Sku } from "../value-objects/sku.js";
import { type NewProductProps, Product } from "./product.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const LATER = new Date("2026-10-30T12:00:00.000Z");
const ONE_MS = 1;
const pesos = (text: string) => Money.fromDecimal(text);

const create = (overrides: Partial<NewProductProps> = {}) =>
  Product.create({
    id: "product-1",
    sku: Sku.fromValue("LMS-000001"),
    title: "Cuaderno A4",
    slug: Slug.fromText("Cuaderno A4"),
    price: pesos("1000"),
    categories: CategoryAssignment.fromIds(["cat-1", "cat-2"], "cat-2"),
    createdBy: "admin-1",
    now: NOW,
    ...overrides,
  });

const deleted = () => {
  const product = create();
  product.softDelete("admin-2", NOW);
  return product;
};

describe("Product", () => {
  describe("create", () => {
    it("starts active and plain: no sale, not featured nor new, no stock nor related", () => {
      const product = create();

      expect(product).toMatchObject({
        title: "Cuaderno A4",
        description: undefined,
        onSale: false,
        salePrice: undefined,
        stock: 0,
        featured: false,
        isNewFlag: false,
        sortOrder: 0,
        active: true,
        relatedProductIds: [],
        createdBy: "admin-1",
        updatedBy: "admin-1",
        createdAt: NOW,
      });
      expect(product.price.toDecimalString()).toBe("1000.00");
      expect(product.sku.toString()).toBe("LMS-000001");
      expect(product.slug.toString()).toBe("cuaderno-a4");
      expect(product.getPrimaryCategoryId()).toBe("cat-2");
      expect(product.isVisible()).toBe(true);
    });

    it("trims the title and description", () => {
      const product = create({ title: "  Cuaderno  ", description: "  Tapa dura  " });

      expect(product).toMatchObject({ title: "Cuaderno", description: "Tapa dura" });
    });

    it.each(["", "  ", "a".repeat(201)])("rejects the title %o", (title) => {
      expect(() => create({ title })).toThrow(InvalidProductTitleError);
    });

    it("rejects a description over 5000 characters", () => {
      expect(() => create({ description: "a".repeat(5001) })).toThrow(InvalidDescriptionError);
    });

    it("rejects a price of zero", () => {
      expect(() => create({ price: pesos("0") })).toThrow(InvalidPriceError);
    });

    it.each([-1, 1.5, 2_147_483_648])("rejects the stock %d", (stock) => {
      expect(() => create({ stock })).toThrow(InvalidStockError);
    });

    it("rejects a negative order", () => {
      expect(() => create({ sortOrder: -1 })).toThrow(InvalidSortOrderError);
    });
  });

  describe("price and sale", () => {
    it("starts a sale below the price, with or without an end", () => {
      const product = create();

      product.startSale(pesos("800"), LATER, NOW);

      expect(product).toMatchObject({ onSale: true, saleEndsAt: LATER });
      expect(product.salePrice?.toDecimalString()).toBe("800.00");
    });

    it.each([
      ["equal to the price", "1000"],
      ["above the price", "1200"],
      ["of zero", "0"],
    ])("refuses a sale price %s", (_label, salePrice) => {
      const product = create();

      expect(() => product.startSale(pesos(salePrice), undefined, NOW)).toThrow(
        SalePriceNotLowerError,
      );
      expect(product.onSale).toBe(false);
    });

    it.each([
      ["now", NOW],
      ["in the past", new Date(NOW.getTime() - ONE_MS)],
    ])("refuses a sale that ends %s", (_label, endsAt) => {
      expect(() => create().startSale(pesos("800"), endsAt, NOW)).toThrow(InvalidSaleEndError);
    });

    it("ends a sale, dropping its price and end", () => {
      const product = create();
      product.startSale(pesos("800"), LATER, NOW);

      product.endSale();

      expect(product).toMatchObject({ onSale: false, salePrice: undefined, saleEndsAt: undefined });
    });

    it("changes the price while a running sale stays below it", () => {
      const product = create();
      product.startSale(pesos("800"), LATER, NOW);

      product.changePrice(pesos("900"), NOW);

      expect(product.price.toDecimalString()).toBe("900.00");
      expect(product.isSaleActive(NOW)).toBe(true);
    });

    it("refuses a price that a running sale would not be below", () => {
      const product = create();
      product.startSale(pesos("800"), LATER, NOW);

      expect(() => product.changePrice(pesos("800"), NOW)).toThrow(SalePriceNotLowerError);
      expect(product.price.toDecimalString()).toBe("1000.00");
    });

    it("drops a sale that already ended when the price changes", () => {
      const product = create();
      product.startSale(pesos("800"), LATER, NOW);

      product.changePrice(pesos("500"), LATER);

      expect(product.price.toDecimalString()).toBe("500.00");
      expect(product).toMatchObject({ onSale: false, salePrice: undefined, saleEndsAt: undefined });
    });

    it("refuses a price of zero", () => {
      expect(() => create().changePrice(pesos("0"), NOW)).toThrow(InvalidPriceError);
    });

    it("changes nothing for the same price, not even a sale that already ended", () => {
      const product = create();
      product.startSale(pesos("800"), LATER, NOW);

      product.changePrice(pesos("1000"), LATER);

      expect(product).toMatchObject({ onSale: true, saleEndsAt: LATER });
      expect(product.salePrice?.toDecimalString()).toBe("800.00");
    });
  });

  describe("sale and new mark end when due", () => {
    it("applies a sale until just before its end, and not from then on", () => {
      const product = create();
      product.startSale(pesos("800"), LATER, NOW);

      expect(product.isSaleActive(new Date(LATER.getTime() - ONE_MS))).toBe(true);
      expect(product.isSaleActive(LATER)).toBe(false);
      // The flag stays stored; only its effect ends.
      expect(product.onSale).toBe(true);
    });

    it("applies a sale without an end until it is ended", () => {
      const product = create();
      product.startSale(pesos("800"), undefined, NOW);

      expect(product.isSaleActive(new Date("2030-01-01T00:00:00.000Z"))).toBe(true);
      product.endSale();
      expect(product.isSaleActive(NOW)).toBe(false);
    });

    it("applies the new mark until just before its end, and not from then on", () => {
      const product = create();
      product.markAsNew(LATER, NOW);

      expect(product.isNewActive(new Date(LATER.getTime() - ONE_MS))).toBe(true);
      expect(product.isNewActive(LATER)).toBe(false);
      expect(product.isNewFlag).toBe(true);
    });

    it("applies the new mark without an end until it is removed", () => {
      const product = create();
      product.markAsNew(undefined, NOW);

      expect(product.isNewActive(new Date("2030-01-01T00:00:00.000Z"))).toBe(true);
      product.unmarkAsNew();
      expect(product).toMatchObject({ isNewFlag: false, newUntil: undefined });
      expect(product.isNewActive(NOW)).toBe(false);
    });

    it("refuses a new mark that ends now or before", () => {
      expect(() => create().markAsNew(NOW, NOW)).toThrow(InvalidNewUntilError);
    });

    it("is never on sale nor new when it was not marked", () => {
      expect(create().isSaleActive(NOW)).toBe(false);
      expect(create().isNewActive(NOW)).toBe(false);
    });
  });

  describe("other changes", () => {
    it("changes title, description, stock, featured, order and state", () => {
      const product = create();

      product.changeTitle(" Libreta ");
      product.changeDescription("Espiral");
      product.setStock(25);
      product.setFeatured(true);
      product.changeSortOrder(4);
      product.deactivate();

      expect(product).toMatchObject({
        title: "Libreta",
        description: "Espiral",
        stock: 25,
        featured: true,
        sortOrder: 4,
        active: false,
      });
      expect(product.slug.toString()).toBe("cuaderno-a4");
      product.activate();
      expect(product.isVisible()).toBe(true);
    });

    it("assigns new categories with a single primary one", () => {
      const product = create();

      product.assignCategories(CategoryAssignment.fromIds(["cat-3"], "cat-3"));

      expect(product.getPrimaryCategoryId()).toBe("cat-3");
      expect(product.categories).toHaveLength(1);
    });

    it.each([
      ["none", []],
      [
        "two primary ones",
        [
          ...CategoryAssignment.fromIds(["cat-1"], "cat-1"),
          ...CategoryAssignment.fromIds(["cat-2"], "cat-2"),
        ],
      ],
      [
        "a repeated one",
        [
          ...CategoryAssignment.fromIds(["cat-1"], "cat-1"),
          ...CategoryAssignment.fromIds(["cat-1", "cat-2"], "cat-2").slice(0, 1),
        ],
      ],
    ])("refuses %s", (_label, assignments) => {
      expect(() => create().assignCategories(assignments)).toThrow(InvalidCategoryAssignmentError);
    });

    it("says there are several primary categories when there are", () => {
      const twoPrimaries = [
        ...CategoryAssignment.fromIds(["cat-1"], "cat-1"),
        ...CategoryAssignment.fromIds(["cat-2"], "cat-2"),
      ];

      expect(() => create().assignCategories(twoPrimaries)).toThrow(
        new InvalidCategoryAssignmentError("severalPrimary"),
      );
    });

    it("keeps related products once each, and never itself", () => {
      const product = create();

      product.setRelatedProducts(["p-2", "p-3", "p-2"]);

      expect(product.relatedProductIds).toEqual(["p-2", "p-3"]);
      expect(() => product.setRelatedProducts(["p-2", "product-1"])).toThrow(
        SelfRelatedProductError,
      );
      expect(product.relatedProductIds).toEqual(["p-2", "p-3"]);
    });

    it("records who changed it", () => {
      const product = create();

      product.markUpdatedBy("admin-2");

      expect(product.updatedBy).toBe("admin-2");
    });
  });

  describe("deletion and restore", () => {
    it("records the date and the admin, keeping the active state", () => {
      const product = create();
      product.deactivate();

      product.softDelete("admin-2", NOW);

      expect(product).toMatchObject({ deletedAt: NOW, updatedBy: "admin-2", active: false });
      expect(product.isVisible()).toBe(false);
    });

    it("keeps the first deletion when deleted again", () => {
      const product = deleted();

      product.softDelete("admin-3", LATER);

      expect(product).toMatchObject({ deletedAt: NOW, updatedBy: "admin-2" });
    });

    it("restores, bringing back the state it had", () => {
      const product = create();
      product.deactivate();
      product.softDelete("admin-2", NOW);

      product.restore("admin-3");

      expect(product).toMatchObject({ deletedAt: undefined, updatedBy: "admin-3", active: false });
    });

    it("refuses to restore a product that is not deleted", () => {
      expect(() => create().restore("admin-2")).toThrow(ProductNotDeletedError);
    });

    it.each([
      ["change the title", (p: Product) => p.changeTitle("Otro")],
      ["change the price", (p: Product) => p.changePrice(pesos("10"), NOW)],
      ["start a sale", (p: Product) => p.startSale(pesos("10"), undefined, NOW)],
      ["set the stock", (p: Product) => p.setStock(1)],
      ["mark as new", (p: Product) => p.markAsNew(undefined, NOW)],
      ["activate", (p: Product) => p.activate()],
      ["relate products", (p: Product) => p.setRelatedProducts([])],
    ])("cannot %s once deleted", (_label, change) => {
      expect(() => change(deleted())).toThrow(ProductDeletedError);
    });
  });

  it("reports a stored product without a primary category as broken data", () => {
    const product = Product.reconstitute({
      id: "product-8",
      sku: Sku.fromValue("LMS-000008"),
      title: "Goma",
      slug: Slug.fromValue("goma"),
      price: pesos("10"),
      onSale: false,
      stock: 0,
      featured: false,
      isNewFlag: false,
      sortOrder: 0,
      active: true,
      categories: [],
      relatedProductIds: [],
      createdAt: NOW,
      updatedAt: NOW,
    });

    expect(() => product.getPrimaryCategoryId()).toThrow(
      "Product product-8 has no primary category",
    );
  });

  it("rebuilds a stored product as it was, without sharing its lists", () => {
    const categories = CategoryAssignment.fromIds(["cat-1"], "cat-1");
    const related = ["p-2"];
    const product = Product.reconstitute({
      id: "product-9",
      sku: Sku.fromValue("LMS-000009"),
      title: "Lápiz",
      slug: Slug.fromValue("lapiz"),
      price: pesos("100"),
      salePrice: pesos("80"),
      onSale: true,
      saleEndsAt: LATER,
      stock: 3,
      featured: true,
      isNewFlag: true,
      newUntil: LATER,
      sortOrder: 1,
      active: true,
      categories,
      relatedProductIds: related,
      createdAt: NOW,
      updatedAt: NOW,
    });
    related.push("p-3");

    expect(product.getId()).toBe("product-9");
    expect(product.isSaleActive(NOW)).toBe(true);
    expect(product.isNewActive(NOW)).toBe(true);
    expect(product.relatedProductIds).toEqual(["p-2"]);
  });
});
