import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";

import { ApiError } from "./api-error";
import { toApiError } from "./to-api-error";

const notTimedOut = { timedOut: false };

function responseError(data: unknown, status: number, headers: Record<string, string> = {}) {
  const config = { headers: new AxiosHeaders() };
  const response = {
    data,
    status,
    statusText: "",
    headers: new AxiosHeaders(headers),
    config,
  } as AxiosResponse;
  return new AxiosError("Request failed", AxiosError.ERR_BAD_RESPONSE, config, null, response);
}

const errorBody = {
  timestamp: "2026-11-01T12:00:00.000Z",
  statusCode: 400,
  code: "VALIDATION_FAILED",
  message: "Hay datos inválidos.",
  path: "/api/v1/admin/products",
  details: [{ field: "title", messages: ["El título es obligatorio."] }],
};

describe("toApiError with a response", () => {
  it("keeps status, code, message and details from the API body", () => {
    const error = toApiError(responseError(errorBody, 400), notTimedOut);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_FAILED",
      message: "Hay datos inválidos.",
      details: errorBody.details,
    });
    expect(error.fieldErrors()).toEqual({ title: ["El título es obligatorio."] });
  });

  it("replaces the technical text of a generic error", () => {
    const body = { ...errorBody, statusCode: 500, code: "INTERNAL_ERROR", details: undefined };

    const error = toApiError(
      responseError({ ...body, message: "Internal server error" }, 500),
      notTimedOut,
    );

    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.message).not.toBe("Internal server error");
  });

  it.each([
    ["an HTML page", "<html>Bad gateway</html>", 502],
    ["an empty body", "", 503],
    ["JSON of another shape", { error: "nope" }, 500],
  ])("reports %s as an unexpected response", (_name, data, status) => {
    const error = toApiError(responseError(data, status), notTimedOut);

    expect(error).toMatchObject({ status, code: "UNEXPECTED_RESPONSE" });
    expect(error.message).toMatch(/inesperado/);
  });

  it("reads Retry-After in seconds", () => {
    const body = { ...errorBody, statusCode: 429, code: "TOO_MANY_REQUESTS", details: undefined };

    const error = toApiError(responseError(body, 429, { "Retry-After": "30" }), notTimedOut);

    expect(error.retryAfter).toBe(30);
  });

  it.each([undefined, "soon", "Wed, 21 Oct 2026 07:28:00 GMT"])(
    "leaves retryAfter empty for Retry-After %s",
    (value) => {
      const headers: Record<string, string> = value === undefined ? {} : { "Retry-After": value };

      const error = toApiError(responseError(errorBody, 429, headers), notTimedOut);

      expect(error.retryAfter).toBeUndefined();
    },
  );

  it("applies the caller's overrides", () => {
    const error = toApiError(responseError(errorBody, 400), notTimedOut, {
      VALIDATION_FAILED: "Revisá el formulario.",
    });

    expect(error.message).toBe("Revisá el formulario.");
  });
});

describe("toApiError without a response", () => {
  it("reports a network failure", () => {
    const cause = new AxiosError("Network Error", AxiosError.ERR_NETWORK);

    const error = toApiError(cause, notTimedOut);

    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR", cause });
    expect(error.message).toMatch(/conexión/);
  });

  it("reports a timeout, whatever was thrown", () => {
    const error = toApiError(new AxiosError("canceled", AxiosError.ERR_CANCELED), {
      timedOut: true,
    });

    expect(error).toMatchObject({ status: 0, code: "TIMEOUT" });
    expect(error.message).toMatch(/tardó demasiado/);
  });

  it("returns an ApiError as is", () => {
    const apiError = new ApiError({ status: 401, code: "INVALID_SESSION", message: "Sesión." });

    expect(toApiError(apiError, notTimedOut)).toBe(apiError);
  });
});
