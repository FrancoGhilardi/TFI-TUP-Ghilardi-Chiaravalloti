import { describe, expect, it } from "vitest";

import { ApiError } from "@/modules/core/http";

import { loginErrorMessage } from "./login-error";

const apiError = (status: number, code: string, message: string, retryAfter?: number) =>
  new ApiError({ status, code, message, retryAfter });

describe("loginErrorMessage", () => {
  it("shows the API's own message for wrong credentials", () => {
    const error = apiError(
      401,
      "INVALID_CREDENTIALS",
      "El email o la contraseña no son correctos.",
    );

    expect(loginErrorMessage(error)).toBe("El email o la contraseña no son correctos.");
  });

  it.each([
    [120, "Esperá 2 minutos"],
    [61, "Esperá 2 minutos"],
    [60, "Esperá 1 minuto"],
    [5, "Esperá 1 minuto"],
    [900, "Esperá 15 minutos"],
  ])("tells how long to wait after too many attempts (%is)", (retryAfter, expected) => {
    const error = apiError(429, "TOO_MANY_REQUESTS", "x", retryAfter);

    expect(loginErrorMessage(error)).toContain(expected);
  });

  it("asks to wait a while when the API gives no time", () => {
    const error = apiError(429, "TOO_MANY_REQUESTS", "x");

    expect(loginErrorMessage(error)).toBe(
      "Hiciste demasiados intentos. Esperá unos minutos y volvé a intentar.",
    );
  });

  it("shows the message the client prepared for connection and server failures", () => {
    const error = apiError(
      0,
      "NETWORK_ERROR",
      "No pudimos conectarnos. Revisá tu conexión a internet.",
    );

    expect(loginErrorMessage(error)).toBe("No pudimos conectarnos. Revisá tu conexión a internet.");
  });

  it("does not show the text of an error that is not the API's", () => {
    expect(loginErrorMessage(new TypeError("boom"))).toBe(
      "No pudimos iniciar sesión. Intentá de nuevo en unos minutos.",
    );
  });
});
