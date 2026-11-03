import { ApiError } from "@/modules/core/http";

import { authContent } from "../content/auth";

/**
 * What to tell the person when signing in failed. The API's messages are already written for
 * them (wrong credentials, no connection, server down); only the wait after too many attempts
 * is worded here, because it depends on the time the API asks for.
 */
export function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return authContent.errors.unexpected;
  }
  if (error.code === "TOO_MANY_REQUESTS") {
    return authContent.errors.tooManyAttempts(error.retryAfter);
  }
  return error.message;
}
