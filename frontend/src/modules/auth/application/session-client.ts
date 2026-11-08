import { createApiClient } from "@/modules/core/http";

import { createAuthApi } from "../infrastructure/auth-api";
import { refreshSession } from "./refresh-session";
import { useSessionStore } from "./session-store";

/**
 * The client for everything the panel asks of the API once someone is signed in: it sends the
 * session's token and a 401 renews it. Every panel module uses this one, so that renewals never
 * compete (the API revokes every session when a refresh token is reused).
 */
export const panelApiClient = createApiClient({
  credentials: "include",
  getAccessToken: () => useSessionStore.getState().accessToken ?? undefined,
  onUnauthorized: refreshSession,
});

/** The auth calls that need a signed-in person. */
export const sessionAuthApi = createAuthApi(panelApiClient);
