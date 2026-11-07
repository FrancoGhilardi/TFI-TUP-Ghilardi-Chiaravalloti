import { create } from "zustand";

import type { LoginResult } from "../infrastructure/auth-api";
import type { AuthenticatedUser } from "../domain/user";

/** `unavailable`: the session could not be restored for a reason that says nothing about it. */
type SessionStatus = "loading" | "authenticated" | "anonymous" | "unavailable";

interface SessionState {
  status: SessionStatus;
  /** Sent in each request; lives only in memory, never in the browser's storage. */
  accessToken: string | null;
  user: AuthenticatedUser | null;
  start: (login: LoginResult) => void;
  /** The session is over, or there never was one to restore. */
  expire: () => void;
  /** The API could not be asked, so whether there is a session is still unknown. */
  markUnavailable: () => void;
  /** Tries to restore the session again. */
  retry: () => void;
}

/** The panel's session. It is lost on reload, as the access token must not outlive the tab. */
export const useSessionStore = create<SessionState>()((set) => ({
  status: "loading",
  accessToken: null,
  user: null,
  start: ({ accessToken, user }) => set({ status: "authenticated", accessToken, user }),
  expire: () => set({ status: "anonymous", accessToken: null, user: null }),
  markUnavailable: () => set({ status: "unavailable" }),
  retry: () => set({ status: "loading" }),
}));
