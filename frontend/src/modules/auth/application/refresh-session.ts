import { ApiError } from "@/modules/core/http";

import { authApi } from "../infrastructure/auth-api";
import { useSessionStore } from "./session-store";

// The API revokes every session when a refresh token is reused, so callers that ask at the same
// time (the panel's start-up, a rejected request, a dev-mode double render) share one call.
let pending: Promise<boolean> | undefined;

/** Only the API saying the refresh token is not valid ends a session; a failed call does not. */
const isRejection = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

/**
 * Asks the API for a new access token with the refresh cookie. Keeps the session when it works
 * and ends it when the API refuses; when the API cannot be reached the session is left as it
 * is (or, if it was being restored, marked unavailable). Resolves to whether there is a session.
 */
export function refreshSession(): Promise<boolean> {
  pending ??= authApi
    .refresh()
    .then(
      (result) => {
        useSessionStore.getState().start(result);
        return true;
      },
      (error: unknown) => {
        const session = useSessionStore.getState();
        if (isRejection(error)) {
          session.expire();
        } else if (session.status === "loading") {
          session.markUnavailable();
        }
        return false;
      },
    )
    .finally(() => {
      pending = undefined;
    });
  return pending;
}
