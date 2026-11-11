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
          { field: "email", messages: ["Email inválido."] },
          { field: "temporaryPassword", messages: ["Muy corta."] },
        ]),
      ),
    ).toEqual({ fields: { email: "Email inválido.", temporaryPassword: "Muy corta." } });
  });

  it.each([
    ["INVALID_USER_NAME", "name"],
    ["INVALID_EMAIL", "email"],
    ["EMAIL_ALREADY_IN_USE", "email"],
    ["INVALID_PASSWORD", "temporaryPassword"],
  ])("places the domain error %s at %s", (code, field) => {
    expect(serverErrorsOf(domain(code, "Mensaje de la API."))).toEqual({
      fields: { [field]: "Mensaje de la API." },
    });
  });

  it.each(["SELF_ADMINISTRATION", "LAST_ACTIVE_ADMIN"])(
    "places %s at the role when the request changed it",
    (code) => {
      expect(serverErrorsOf(domain(code, "No podés."), { role: "SELLER" })).toEqual({
        fields: { role: "No podés." },
      });
    },
  );

  it.each(["SELF_ADMINISTRATION", "LAST_ACTIVE_ADMIN"])(
    "places %s at the state when the request did not change the role",
    (code) => {
      expect(serverErrorsOf(domain(code, "No podés."), {})).toEqual({
        fields: { isActive: "No podés." },
      });
      expect(serverErrorsOf(domain(code, "No podés."))).toEqual({
        fields: { isActive: "No podés." },
      });
    },
  );

  it.each([
    ["USER_DELETED", 422],
    ["USER_NOT_FOUND", 404],
    ["INTERNAL_ERROR", 500],
  ])("leaves %s as a general message", (code, status) => {
    expect(serverErrorsOf(domain(code, "Algo pasó.", status))).toEqual({
      fields: {},
      general: "Algo pasó.",
    });
  });

  it("says something generic for a failure that is not the API's", () => {
    expect(serverErrorsOf(new TypeError("boom"))).toEqual({
      fields: {},
      general: "No pudimos guardar el usuario. Probá de nuevo.",
    });
  });
});
