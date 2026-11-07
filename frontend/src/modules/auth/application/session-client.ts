import { createApiClient } from "@/modules/core/http";

import { createAuthApi } from "../infrastructure/auth-api";
import { refreshSession } from "./refresh-session";
import { useSessionStore } from "./session-store";

/** The auth calls that need a signed-in person: the token is the session's and 401s renew it. */
export const sessionAuthApi = createAuthApi(
  createApiClient({
    credentials: "include",
    getAccessToken: () => useSessionStore.getState().accessToken ?? undefined,
    onUnauthorized: refreshSession,
  }),
);
