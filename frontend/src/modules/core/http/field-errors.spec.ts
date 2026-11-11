import { describe, expect, it } from "vitest";

import { ApiError } from "./api-error";
import { serverFieldErrors } from "./field-errors";

type Field = "name" | "parent" | "position";

const tables = {
  fieldOfName: { name: "name", parentId: "parent", sortOrder: "position" } as Record<string, Field>,
  fieldOfCode: { NAME_TAKEN: "name", CYCLE: "parent" } as Record<string, Field>,
  fallback: "No pudimos guardar.",
};

const validation = (details: { field: string; messages: string[] }[]) =>
  new ApiError({ status: 400, code: "VALIDATION_FAILED", message: "Revisá los datos.", details });

const domain = (code: string, message: string, status = 422) =>
  new ApiError({ status, code, message });

describe("serverFieldErrors", () => {
  it("places each field the validation names, with the server's own message", () => {
    expect(
      serverFieldErrors(
        validation([
          { field: "name", messages: ["Muy largo."] },
          { field: "parentId", messages: ["No es un id."] },
        ]),
        tables,
      ),
    ).toEqual({ fields: { name: "Muy largo.", parent: "No es un id." } });
  });

  it("joins the messages of a field and reads the root of a nested path", () => {
    const errors = serverFieldErrors(
      validation([
        { field: "sortOrder.0", messages: ["Uno.", "Dos."] },
        { field: "sortOrder[1]", messages: ["Tres."] },
      ]),
      tables,
    );

    expect(errors.fields.position).toBe("Uno. Dos.");
  });

  it("puts a field it does not know in the general message", () => {
    expect(
      serverFieldErrors(
        validation([
          { field: "name", messages: ["Mal."] },
          { field: "nuevo", messages: ["Algo."] },
        ]),
        tables,
      ),
    ).toEqual({ fields: { name: "Mal." }, general: "Algo." });
  });

  it("places a domain error by its code", () => {
    expect(serverFieldErrors(domain("CYCLE", "Haría un ciclo."), tables)).toEqual({
      fields: { parent: "Haría un ciclo." },
    });
  });

  it("leaves a code that concerns no field as the general message", () => {
    expect(serverFieldErrors(domain("INTERNAL_ERROR", "Falló.", 500), tables)).toEqual({
      fields: {},
      general: "Falló.",
    });
  });

  it("says the fallback for a failure that is not the API's", () => {
    expect(serverFieldErrors(new TypeError("boom"), tables)).toEqual({
      fields: {},
      general: "No pudimos guardar.",
    });
  });
});
