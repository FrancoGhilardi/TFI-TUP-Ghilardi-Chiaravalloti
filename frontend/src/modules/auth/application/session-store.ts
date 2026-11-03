import { create } from "zustand";

import type { LoginResult } from "../infrastructure/auth-api";
import type { AuthenticatedUser } from "../domain/user";

type SessionStatus = "loading" | "authenticated" | "anonymous";

interface SessionState {
  status: SessionStatus;
  /** Sent in each request; lives only in memory, never in the browser's storage. */
  accessToken: string | null;
  user: AuthenticatedUser | null;
  start: (login: LoginResult) => void;
}

/** The panel's session. It is lost on reload, as the access token must not outlive the tab. */
export const useSessionStore = create<SessionState>()((set) => ({
  status: "loading",
  accessToken: null,
  user: null,
  start: ({ accessToken, user }) => set({ status: "authenticated", accessToken, user }),
}));
