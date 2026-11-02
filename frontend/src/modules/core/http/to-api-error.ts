import { AxiosHeaders, type AxiosResponse, isAxiosError } from "axios";

import { ApiError, CLIENT_ERROR_CODES } from "./api-error";
import type { ErrorResponse } from "./api-types";
import { type ErrorMessageOverrides, resolveErrorMessage } from "./error-messages";

function isErrorResponse(body: unknown): body is ErrorResponse {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { statusCode, code, message } = body as Record<string, unknown>;
  return typeof statusCode === "number" && typeof code === "string" && typeof message === "string";
}

function parseRetryAfter(response: AxiosResponse): number | undefined {
  const { headers } = response;
  // Responses carry AxiosHeaders, whose lookup ignores case; a plain object is read as lowercase.
  const value =
    headers instanceof AxiosHeaders ? headers.get("Retry-After") : headers["retry-after"];
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return undefined;
  }
  return Number(value);
}

function clientError(
  code: string,
  status: number,
  overrides: ErrorMessageOverrides | undefined,
  extra: { retryAfter?: number; cause?: unknown } = {},
): ApiError {
  return new ApiError({
    status,
    code,
    message: resolveErrorMessage(code, undefined, overrides),
    ...extra,
  });
}

/** Builds the error for a response whose body is not what the API sends. */
export function unexpectedResponse(
  response: AxiosResponse,
  overrides?: ErrorMessageOverrides,
): ApiError {
  return clientError(CLIENT_ERROR_CODES.unexpectedResponse, response.status, overrides, {
    retryAfter: parseRetryAfter(response),
  });
}

/** Turns anything a request threw into an `ApiError`. */
export function toApiError(
  error: unknown,
  { timedOut }: { timedOut: boolean },
  overrides?: ErrorMessageOverrides,
): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (timedOut) {
    return clientError(CLIENT_ERROR_CODES.timeout, 0, overrides, { cause: error });
  }
  const response = isAxiosError(error) ? error.response : undefined;
  if (response === undefined) {
    return clientError(CLIENT_ERROR_CODES.network, 0, overrides, { cause: error });
  }
  const body: unknown = response.data;
  if (!isErrorResponse(body)) {
    return unexpectedResponse(response, overrides);
  }
  return new ApiError({
    status: response.status,
    code: body.code,
    message: resolveErrorMessage(body.code, body.message, overrides),
    details: body.details,
    retryAfter: parseRetryAfter(response),
  });
}
