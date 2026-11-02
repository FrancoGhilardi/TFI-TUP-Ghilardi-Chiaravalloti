import { describe, expect, it } from "vitest";

import { resolveErrorMessage } from "./error-messages";

describe("resolveErrorMessage", () => {
  it("keeps the API message for a domain error", () => {
    expect(resolveErrorMessage("PRODUCT_NOT_FOUND", "El producto no existe.")).toBe(
      "El producto no existe.",
    );
  });

  it("replaces the API message for a generic error", () => {
    const message = resolveErrorMessage("INTERNAL_ERROR", "Internal server error");

    expect(message).not.toBe("Internal server error");
    expect(message).toMatch(/inesperado/);
  });

  it("uses the caller's override before anything else", () => {
    const overrides = { PRODUCT_NOT_FOUND: "Este producto ya no está disponible." };

    expect(resolveErrorMessage("PRODUCT_NOT_FOUND", "El producto no existe.", overrides)).toBe(
      "Este producto ya no está disponible.",
    );
    expect(
      resolveErrorMessage("NETWORK_ERROR", undefined, { NETWORK_ERROR: "Sin conexión." }),
    ).toBe("Sin conexión.");
  });

  it("falls back to a default message when there is no text at all", () => {
    expect(resolveErrorMessage("SOMETHING_NEW", undefined)).toMatch(/inesperado/);
    expect(resolveErrorMessage("SOMETHING_NEW", "")).toMatch(/inesperado/);
  });
});
