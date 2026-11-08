import { describe, expect, it } from "vitest";

import type { AdminProductDetail } from "./admin-product";
import {
  EMPTY_PRODUCT_FORM,
  initialValuesOf,
  type ProductFormValues,
  productFormSchema,
} from "./product-form";

const NOW = new Date("2026-12-01T15:00:00.000Z");
const ARGENTINA = () => -180;

const file = (name = "foto.png") => new File(["x"], name, { type: "image/png" });

const valid = (overrides: Partial<ProductFormValues> = {}): ProductFormValues => ({
  ...EMPTY_PRODUCT_FORM,
  title: "Cuaderno rayado",
  price: "1500",
  stock: "10",
  categoryIds: ["c1"],
  primaryCategoryId: "c1",
  ...overrides,
});

const issues = (values: ProductFormValues, mode: "create" | "edit" = "edit") => {
  const result = productFormSchema({ mode, now: NOW, offsetOf: ARGENTINA }).safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => [issue.path.join("."), issue.message]);
};

describe("productFormSchema", () => {
  it("accepts a complete product that is being edited", () => {
    expect(issues(valid())).toEqual([]);
  });

  describe("title and description", () => {
    it.each(["", "   "])("asks for the title when it is %j", (title) => {
      expect(issues(valid({ title }))).toEqual([["title", "Escribí el título."]]);
    });

    it("takes a title of 200 characters and refuses 201, counting a letter with accent once", () => {
      expect(issues(valid({ title: "á".repeat(200) }))).toEqual([]);
      expect(issues(valid({ title: "á".repeat(201) }))).toEqual([
        ["title", "El título puede tener hasta 200 caracteres."],
      ]);
    });

    it("takes a description of 5000 characters and refuses more", () => {
      expect(issues(valid({ description: "a".repeat(5000) }))).toEqual([]);
      expect(issues(valid({ description: "a".repeat(5001) }))).toEqual([
        ["description", "La descripción puede tener hasta 5000 caracteres."],
      ]);
    });
  });

  describe("price, stock and position", () => {
    it.each([
      ["", "Escribí el precio."],
      ["abc", "Escribí un precio válido, como 1500 o 1500,50."],
      ["0", "El precio tiene que ser mayor que cero."],
      ["1000000000000", "El precio es demasiado alto."],
    ])("refuses the price %j", (price, message) => {
      expect(issues(valid({ price }))).toEqual([["price", message]]);
    });

    it("accepts a price typed with a comma", () => {
      expect(issues(valid({ price: "1500,50" }))).toEqual([]);
    });

    it.each(["", "-1", "1.5", "abc", "2147483648"])("refuses the stock %j", (stock) => {
      expect(issues(valid({ stock }))).toEqual([
        ["stock", "Escribí el stock como un número entero, 0 o más."],
      ]);
    });

    it.each(["0", "2147483647"])("accepts the stock %s", (stock) => {
      expect(issues(valid({ stock }))).toEqual([]);
    });

    it.each(["", "-2", "1.5"])("refuses the position %j", (sortOrder) => {
      expect(issues(valid({ sortOrder }))).toEqual([
        ["sortOrder", "Escribí la posición como un número entero, 0 o más."],
      ]);
    });
  });

  describe("offer", () => {
    it("asks for the offer price when the offer is on", () => {
      expect(issues(valid({ isOnSale: true }))).toEqual([
        ["salePrice", "Escribí el precio de oferta."],
      ]);
    });

    it.each(["1500", "1600"])("wants an offer price lower than the price, not %s", (salePrice) => {
      expect(issues(valid({ isOnSale: true, salePrice }))).toEqual([
        ["salePrice", "El precio de oferta tiene que ser menor que el precio."],
      ]);
    });

    it("takes a lower offer price, typed with a comma", () => {
      expect(issues(valid({ isOnSale: true, salePrice: "1499,99" }))).toEqual([]);
    });

    it("does not look at the offer fields while the offer is off", () => {
      expect(issues(valid({ isOnSale: false, salePrice: "abc", saleEndsAt: "ayer" }))).toEqual([]);
    });

    it("does not compare with a price that is not valid yet", () => {
      expect(issues(valid({ price: "", isOnSale: true, salePrice: "100" }))).toEqual([
        ["price", "Escribí el precio."],
      ]);
    });

    it("refuses an end that is not a day or is in the past, and takes today and later", () => {
      const on = { isOnSale: true, salePrice: "1000" };

      expect(issues(valid({ ...on, saleEndsAt: "2026-02-30" }))).toEqual([
        ["saleEndsAt", "Elegí un día válido."],
      ]);
      expect(issues(valid({ ...on, saleEndsAt: "2026-11-30" }))).toEqual([
        ["saleEndsAt", "El día no puede ser anterior a hoy."],
      ]);
      expect(issues(valid({ ...on, saleEndsAt: "2026-12-01" }))).toEqual([]);
      expect(issues(valid({ ...on, saleEndsAt: "2027-01-01" }))).toEqual([]);
    });
  });

  describe("days brought by a product being edited", () => {
    const context = (initial: ProductFormValues) => ({
      mode: "edit" as const,
      now: NOW,
      offsetOf: ARGENTINA,
      initial,
    });
    const run = (values: ProductFormValues, initial: ProductFormValues) => {
      const result = productFormSchema(context(initial)).safeParse(values);
      return result.success
        ? []
        : result.error.issues.map((issue) => [issue.path.join("."), issue.message]);
    };
    const expired = valid({
      isOnSale: true,
      salePrice: "1000",
      saleEndsAt: "2026-11-20",
      isNew: true,
      newUntil: "2026-11-25",
    });

    it("leaves alone an end that already passed and nobody touched, so the product can be edited", () => {
      expect(run({ ...expired, stock: "3" }, expired)).toEqual([]);
    });

    it("still refuses a past day that was typed", () => {
      expect(run({ ...expired, saleEndsAt: "2026-11-21" }, expired)).toEqual([
        ["saleEndsAt", "El día no puede ser anterior a hoy."],
      ]);
      expect(run({ ...expired, newUntil: "2026-11-26" }, expired)).toEqual([
        ["newUntil", "El día no puede ser anterior a hoy."],
      ]);
    });

    it("still refuses a day that is not a day, even if it was there before", () => {
      const broken = { ...expired, saleEndsAt: "2026-02-30" };

      expect(run(broken, broken)).toEqual([["saleEndsAt", "Elegí un día válido."]]);
    });

    it("refuses the same past day when the product is being created", () => {
      expect(issues(expired, "create").map(([path]) => path)).toContain("saleEndsAt");
    });
  });

  describe("new", () => {
    it("takes no day, a day to come and today, and refuses a past or an invalid one", () => {
      expect(issues(valid({ isNew: true }))).toEqual([]);
      expect(issues(valid({ isNew: true, newUntil: "2026-12-01" }))).toEqual([]);
      expect(issues(valid({ isNew: true, newUntil: "2026-11-30" }))).toEqual([
        ["newUntil", "El día no puede ser anterior a hoy."],
      ]);
      expect(issues(valid({ isNew: true, newUntil: "pronto" }))).toEqual([
        ["newUntil", "Elegí un día válido."],
      ]);
    });

    it("does not look at the day while the mark is off", () => {
      expect(issues(valid({ isNew: false, newUntil: "2020-01-01" }))).toEqual([]);
    });
  });

  describe("categories and related products", () => {
    it("wants at least one category", () => {
      expect(issues(valid({ categoryIds: [], primaryCategoryId: "" }))).toEqual([
        ["categoryIds", "Elegí al menos una categoría."],
      ]);
    });

    it("wants a primary one among those chosen", () => {
      expect(issues(valid({ categoryIds: ["c1", "c2"], primaryCategoryId: "c9" }))).toEqual([
        ["categoryIds", "Elegí cuál es la categoría principal."],
      ]);
      expect(issues(valid({ categoryIds: ["c1", "c2"], primaryCategoryId: "" }))).toEqual([
        ["categoryIds", "Elegí cuál es la categoría principal."],
      ]);
    });

    it("takes up to 4 related products", () => {
      const related = (count: number) =>
        Array.from({ length: count }, (_, index) => ({ id: `p${index}`, title: "x", sku: "s" }));

      expect(issues(valid({ relatedProducts: related(4) }))).toEqual([]);
      expect(issues(valid({ relatedProducts: related(5) }))).toEqual([
        ["relatedProducts", "Podés elegir hasta 4 productos similares."],
      ]);
    });
  });

  describe("images", () => {
    const images = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        key: `k${index}`,
        file: file(`f${index}.png`),
        altText: "",
      }));

    it("wants between 1 and 5 when creating", () => {
      expect(issues(valid({ images: images(1) }), "create")).toEqual([]);
      expect(issues(valid({ images: images(5) }), "create")).toEqual([]);
      expect(issues(valid(), "create")).toEqual([["images", "Sumá al menos una imagen."]]);
      expect(issues(valid({ images: images(6) }), "create")).toEqual([
        ["images", "Podés subir hasta 5 imágenes."],
      ]);
    });

    it("does not ask for images when editing, where they have their own screen", () => {
      expect(issues(valid(), "edit")).toEqual([]);
    });

    it("refuses an alternative text over 255 characters, naming the image", () => {
      const [first, second] = images(2);

      expect(
        issues(valid({ images: [first, { ...second, altText: "a".repeat(256) }] }), "create"),
      ).toEqual([["images.1.altText", "El texto alternativo puede tener hasta 255 caracteres."]]);
    });
  });

  it("reports every problem at once, so the form can mark them all", () => {
    expect(issues(valid({ title: "", price: "", stock: "" })).map(([path]) => path)).toEqual([
      "title",
      "price",
      "stock",
    ]);
  });
});

describe("initialValuesOf", () => {
  const detail: AdminProductDetail = {
    id: "p1",
    sku: "LMS-000001",
    slug: "cuaderno",
    title: "Cuaderno",
    description: null,
    price: "1500.00",
    salePrice: "1200.50",
    saleEndsAt: new Date("2026-12-02T02:59:00.000Z"),
    stock: 7,
    sortOrder: 2,
    isActive: false,
    isFeatured: true,
    isOnSale: true,
    isNew: true,
    newUntil: null,
    primaryCategoryId: "c2",
    categories: [
      { id: "c2", name: "Cuadernos", slug: "cuadernos" },
      { id: "c1", name: "Librería", slug: "libreria" },
    ],
    relatedProducts: [{ id: "p2", title: "Regla", sku: "LMS-000002", slug: "regla" }],
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
  };

  it("shows each value the way the fields take it", () => {
    expect(initialValuesOf(detail, ARGENTINA)).toEqual({
      title: "Cuaderno",
      description: "",
      price: "1500",
      stock: "7",
      sortOrder: "2",
      isActive: false,
      isFeatured: true,
      isOnSale: true,
      salePrice: "1200,50",
      saleEndsAt: "2026-12-01",
      isNew: true,
      newUntil: "",
      categoryIds: ["c2", "c1"],
      primaryCategoryId: "c2",
      relatedProducts: [{ id: "p2", title: "Regla", sku: "LMS-000002" }],
      images: [],
    });
  });

  it("passes the form's own rules when nothing was touched", () => {
    const values = initialValuesOf(detail, ARGENTINA);

    expect(issues(values)).toEqual([]);
  });
});
