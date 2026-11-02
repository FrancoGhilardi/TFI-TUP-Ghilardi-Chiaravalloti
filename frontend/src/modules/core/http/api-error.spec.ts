import { describe, expect, it } from "vitest";

import { ApiError } from "./api-error";

describe("ApiError.fieldErrors", () => {
  it("maps each invalid field to its messages", () => {
    const error = new ApiError({
      status: 400,
      code: "VALIDATION_FAILED",
      message: "Hay datos inválidos.",
      details: [
        { field: "email", messages: ["El email no es válido."] },
        { field: "images.0", messages: ["La imagen es muy grande.", "Formato no admitido."] },
      ],
    });

    expect(error.fieldErrors()).toEqual({
      email: ["El email no es válido."],
      "images.0": ["La imagen es muy grande.", "Formato no admitido."],
    });
  });

  it("is empty for any other error, even with details", () => {
    const error = new ApiError({
      status: 409,
      code: "CATEGORY_IN_USE",
      message: "La categoría tiene productos.",
      details: { count: 3 },
    });

    expect(error.fieldErrors()).toEqual({});
  });
});
