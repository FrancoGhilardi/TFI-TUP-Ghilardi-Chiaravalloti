import { describe, expect, it } from "vitest";

import { ApiError } from "@/modules/core/http";

import { serverErrorsOf } from "./form-errors";

const validation = (details: { field: string; messages: string[] }[]) =>
  new ApiError({ status: 400, code: "VALIDATION_FAILED", message: "Revisá los datos.", details });

const domain = (code: string, message: string, status = 400) =>
  new ApiError({ status, code, message });

describe("serverErrorsOf", () => {
  it("places each field the validation names, with the server's own message", () => {
    const errors = serverErrorsOf(
      validation([
        { field: "title", messages: ["El título es muy largo."] },
        { field: "price", messages: ["El precio no es válido."] },
      ]),
    );

    expect(errors).toEqual({
      fields: { title: "El título es muy largo.", price: "El precio no es válido." },
    });
  });

  it("joins several messages of one field", () => {
    expect(
      serverErrorsOf(validation([{ field: "stock", messages: ["Uno.", "Dos."] }])).fields.stock,
    ).toBe("Uno. Dos.");
  });

  it.each([
    ["primaryCategoryId", "categoryIds"],
    ["categoryIds.0", "categoryIds"],
    ["relatedProductIds.1", "relatedProducts"],
    ["relatedProductIds[2]", "relatedProducts"],
    ["imageAltTexts.0", "images"],
    ["saleEndsAt", "saleEndsAt"],
    ["newUntil", "newUntil"],
    ["sortOrder", "sortOrder"],
  ])("places the validation of %s at %s", (field, expected) => {
    expect(Object.keys(serverErrorsOf(validation([{ field, messages: ["Mal."] }])).fields)).toEqual(
      [expected],
    );
  });

  it("keeps the first message when two paths land on the same field", () => {
    const errors = serverErrorsOf(
      validation([
        { field: "relatedProductIds.0", messages: ["Primero."] },
        { field: "relatedProductIds.1", messages: ["Segundo."] },
      ]),
    );

    expect(errors.fields.relatedProducts).toBe("Primero.");
  });

  it("puts a field it does not know in the general message, not lost", () => {
    const errors = serverErrorsOf(
      validation([
        { field: "title", messages: ["Mal título."] },
        { field: "algoNuevo", messages: ["Algo falló."] },
      ]),
    );

    expect(errors).toEqual({ fields: { title: "Mal título." }, general: "Algo falló." });
  });

  it.each([
    ["INVALID_PRODUCT_TITLE", "title"],
    ["INVALID_SLUG", "title"],
    ["INVALID_DESCRIPTION", "description"],
    ["INVALID_MONEY", "price"],
    ["INVALID_PRICE", "price"],
    ["INVALID_STOCK", "stock"],
    ["INVALID_SORT_ORDER", "sortOrder"],
    ["SALE_PRICE_NOT_LOWER", "salePrice"],
    ["INVALID_SALE_END", "saleEndsAt"],
    ["INVALID_NEW_UNTIL", "newUntil"],
    ["INVALID_CATEGORY_ASSIGNMENT", "categoryIds"],
    ["CATEGORY_UNAVAILABLE", "categoryIds"],
    ["INVALID_RELATED_PRODUCTS", "relatedProducts"],
    ["RELATED_PRODUCT_UNAVAILABLE", "relatedProducts"],
    ["SELF_RELATED_PRODUCT", "relatedProducts"],
    ["INVALID_IMAGE", "images"],
    ["INVALID_IMAGE_COUNT", "images"],
  ])("places the domain error %s at %s", (code, field) => {
    expect(serverErrorsOf(domain(code, "Mensaje de la API."))).toEqual({
      fields: { [field]: "Mensaje de la API." },
    });
  });

  it.each([
    ["IMAGE_UPLOAD_FAILED", 502],
    ["PRODUCT_DELETED", 422],
    ["TOO_MANY_REQUESTS", 429],
    ["NETWORK_ERROR", 0],
    ["INTERNAL_ERROR", 500],
  ])("leaves %s, which concerns no field, as the general message", (code, status) => {
    expect(serverErrorsOf(domain(code, "No se pudo.", status))).toEqual({
      fields: {},
      general: "No se pudo.",
    });
  });

  it("says something generic for a failure that is not the API's", () => {
    expect(serverErrorsOf(new TypeError("boom"))).toEqual({
      fields: {},
      general: "No pudimos guardar el producto. Probá de nuevo.",
    });
  });
});
