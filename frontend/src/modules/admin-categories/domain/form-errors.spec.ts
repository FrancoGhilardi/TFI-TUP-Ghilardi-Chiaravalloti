import { describe, expect, it } from "vitest";

import { ApiError } from "@/modules/core/http";

import { serverErrorsOf } from "./form-errors";

const validation = (details: { field: string; messages: string[] }[]) =>
  new ApiError({ status: 400, code: "VALIDATION_FAILED", message: "Revisá los datos.", details });

const domain = (code: string, message: string, status = 422) =>
  new ApiError({ status, code, message });

describe("serverErrorsOf", () => {
  it("places each field the validation names, with the server's own message", () => {
    expect(
      serverErrorsOf(
        validation([
          { field: "name", messages: ["Muy largo."] },
          { field: "parentId", messages: ["No es un id."] },
        ]),
      ),
    ).toEqual({ fields: { name: "Muy largo.", parentId: "No es un id." } });
  });

  it.each([
    ["INVALID_CATEGORY_NAME", "name"],
    ["INVALID_SLUG", "name"],
    ["CATEGORY_NAME_IN_USE", "name"],
    ["INVALID_DESCRIPTION", "description"],
    ["INVALID_SORT_ORDER", "sortOrder"],
    ["CATEGORY_CYCLE", "parentId"],
    ["PARENT_CATEGORY_UNAVAILABLE", "parentId"],
  ])("places the domain error %s at %s", (code, field) => {
    expect(serverErrorsOf(domain(code, "Mensaje de la API."))).toEqual({
      fields: { [field]: "Mensaje de la API." },
    });
  });

  it.each([
    ["CATEGORY_DELETED", 422],
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
      general: "No pudimos guardar la categoría. Probá de nuevo.",
    });
  });
});
