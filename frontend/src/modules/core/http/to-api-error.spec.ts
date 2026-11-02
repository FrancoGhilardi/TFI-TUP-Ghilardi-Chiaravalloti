import { describe, expect, it } from "vitest";

import { ApiError } from "./api-error";
import { fromRequestFailure, fromResponse } from "./to-api-error";

function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

const errorBody = {
  timestamp: "2026-11-01T12:00:00.000Z",
  statusCode: 400,
  code: "VALIDATION_FAILED",
  message: "Hay datos inválidos.",
  path: "/api/v1/admin/products",
  details: [{ field: "title", messages: ["El título es obligatorio."] }],
};

describe("fromResponse", () => {
  it("keeps status, code, message and details from the API body", async () => {
    const error = await fromResponse(jsonResponse(errorBody, 400));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_FAILED",
      message: "Hay datos inválidos.",
      details: errorBody.details,
    });
    expect(error.fieldErrors()).toEqual({ title: ["El título es obligatorio."] });
  });

  it("replaces the technical text of a generic error", async () => {
    const body = {
      ...errorBody,
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      details: undefined,
    };

    const error = await fromResponse(jsonResponse(body, 500));

    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.message).not.toBe("Internal server error");
  });

  it.each([
    ["an HTML page", new Response("<html>Bad gateway</html>", { status: 502 })],
    ["an empty body", new Response(null, { status: 503 })],
    ["JSON of another shape", jsonResponse({ error: "nope" }, 500)],
  ])("reports %s as an unexpected response", async (_name, response) => {
    const error = await fromResponse(response);

    expect(error).toMatchObject({ status: response.status, code: "UNEXPECTED_RESPONSE" });
    expect(error.message).toMatch(/inesperado/);
  });

  it("reads Retry-After in seconds", async () => {
    const body = { ...errorBody, statusCode: 429, code: "TOO_MANY_REQUESTS", details: undefined };

    const error = await fromResponse(jsonResponse(body, 429, { "Retry-After": "30" }));

    expect(error.retryAfter).toBe(30);
  });

  it.each([undefined, "soon", "Wed, 21 Oct 2026 07:28:00 GMT"])(
    "leaves retryAfter empty for Retry-After %s",
    async (value) => {
      const headers: Record<string, string> = value === undefined ? {} : { "Retry-After": value };

      const error = await fromResponse(jsonResponse(errorBody, 429, headers));

      expect(error.retryAfter).toBeUndefined();
    },
  );

  it("applies the caller's overrides", async () => {
    const error = await fromResponse(jsonResponse(errorBody, 400), {
      VALIDATION_FAILED: "Revisá el formulario.",
    });

    expect(error.message).toBe("Revisá el formulario.");
  });
});

describe("fromResponse reading the body", () => {
  it("throws a failure while reading the body instead of hiding it", async () => {
    const reason = new DOMException("timed out", "TimeoutError");
    const body = new ReadableStream({ start: (controller) => controller.error(reason) });

    await expect(fromResponse(new Response(body, { status: 500 }))).rejects.toBe(reason);
  });
});

describe("fromRequestFailure", () => {
  it("reports a network failure", () => {
    const cause = new TypeError("fetch failed");

    const error = fromRequestFailure(cause, { timedOut: false });

    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR", cause });
    expect(error.message).toMatch(/conexión/);
  });

  it("reports a timeout", () => {
    const error = fromRequestFailure(new DOMException("timed out", "TimeoutError"), {
      timedOut: true,
    });

    expect(error).toMatchObject({ status: 0, code: "TIMEOUT" });
    expect(error.message).toMatch(/tardó demasiado/);
  });
});
