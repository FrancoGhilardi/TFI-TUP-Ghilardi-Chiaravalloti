import type { ZodType } from "zod";

import { ApiError, CLIENT_ERROR_CODES } from "./api-error";
import { resolveErrorMessage } from "./error-messages";

/**
 * Checks a successful response body against the shape the module expects. A mismatch (a contract
 * change, a malformed body) is reported as an unexpected response, so callers that tolerate API
 * failures tolerate it too instead of crashing on the first missing field.
 */
export function parseResponse<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const code = CLIENT_ERROR_CODES.unexpectedResponse;
    throw new ApiError({
      status: 200,
      code,
      message: resolveErrorMessage(code, undefined),
      cause: result.error,
    });
  }
  return result.data;
}
