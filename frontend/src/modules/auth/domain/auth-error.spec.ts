import { describe, expect, it } from "vitest";

import { ApiError } from "@/modules/core/http";

import { authErrorMessage } from "./auth-error";

const FALLBACK = "No pudimos iniciar sesión. Intentá de nuevo en unos minutos.";

const apiError = (status: number, code: string, message: string, retryAfter?: number) =>
  new ApiError({ status, code, message, retryAfter });

describe("authErrorMessage", () => {
  it("shows the API's own message for wrong credentials", () => {
    const error = apiError(
      401,
      "INVALID_CREDENTIALS",
      "El email o la contraseña no son correctos.",
    );

    expect(authErrorMessage(error, FALLBACK)).toBe("El email o la contraseña no son correctos.");
  });

  it.each([
    [120, "Esperá 2 minutos"],
    [61, "Esperá 2 minutos"],
    [60, "Esperá 1 minuto"],
    [5, "Esperá 1 minuto"],
    [900, "Esperá 15 minutos"],
  ])("tells how long to wait after too many attempts (%is)", (retryAfter, expected) => {
    const error = apiError(429, "TOO_MANY_REQUESTS", "x", retryAfter);

    expect(authErrorMessage(error, FALLBACK)).toContain(expected);
  });

  it("asks to wait a while when the API gives no time", () => {
    const error = apiError(429, "TOO_MANY_REQUESTS", "x");

    expect(authErrorMessage(error, FALLBACK)).toBe(
      "Hiciste demasiados intentos. Esperá unos minutos y volvé a intentar.",
    );
  });

  it("shows the message the client prepared for connection and server failures", () => {
    const error = apiError(
      0,
      "NETWORK_ERROR",
      "No pudimos conectarnos. Revisá tu conexión a internet.",
    );

    expect(authErrorMessage(error, FALLBACK)).toBe(
      "No pudimos conectarnos. Revisá tu conexión a internet.",
    );
  });

  it("uses the fallback for an error that is not the API's", () => {
    expect(authErrorMessage(new TypeError("boom"), FALLBACK)).toBe(FALLBACK);
  });
});
