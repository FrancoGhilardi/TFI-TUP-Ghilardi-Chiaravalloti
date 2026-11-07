import { ApiError } from "@/modules/core/http";

import { authContent } from "../content/auth";

/**
 * What to tell the person when an auth request failed. The API's messages are already written
 * for them (wrong credentials, no connection, server down); only the wait after too many
 * attempts is worded here, because it depends on the time the API asks for. `fallback` covers
 * errors that are not the API's.
 */
export function authErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }
  if (error.code === "TOO_MANY_REQUESTS") {
    return authContent.errors.tooManyAttempts(error.retryAfter);
  }
  return error.message;
}
