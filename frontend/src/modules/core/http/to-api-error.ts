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

/** `undefined` for a body that is not JSON; a failure while reading it (such as an abort) is thrown. */
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function parseRetryAfter(response: Response): number | undefined {
  const value = response.headers.get("Retry-After");
  if (value === null || !/^\d+$/.test(value.trim())) {
    return undefined;
  }
  return Number(value);
}

/** Builds the error for a response whose body is not what the API sends. */
export function unexpectedResponse(
  status: number,
  overrides?: ErrorMessageOverrides,
  retryAfter?: number,
): ApiError {
  const code = CLIENT_ERROR_CODES.unexpectedResponse;
  return new ApiError({
    status,
    code,
    message: resolveErrorMessage(code, undefined, overrides),
    retryAfter,
  });
}

/** Builds the error for a non-2xx response, whatever its body. */
export async function fromResponse(
  response: Response,
  overrides?: ErrorMessageOverrides,
): Promise<ApiError> {
  const body = await readJson(response);
  const retryAfter = parseRetryAfter(response);
  if (!isErrorResponse(body)) {
    return unexpectedResponse(response.status, overrides, retryAfter);
  }
  return new ApiError({
    status: response.status,
    code: body.code,
    message: resolveErrorMessage(body.code, body.message, overrides),
    details: body.details,
    retryAfter,
  });
}

/** Builds the error for a request that never got a response. */
export function fromRequestFailure(
  cause: unknown,
  { timedOut }: { timedOut: boolean },
  overrides?: ErrorMessageOverrides,
): ApiError {
  const code = timedOut ? CLIENT_ERROR_CODES.timeout : CLIENT_ERROR_CODES.network;
  return new ApiError({
    status: 0,
    code,
    message: resolveErrorMessage(code, undefined, overrides),
    cause,
  });
}
