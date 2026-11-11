import { create } from "zustand";

import type { LoginResult } from "../infrastructure/auth-api";
import type { SessionStatus } from "../domain/session-status";
import type { AuthenticatedUser } from "../domain/user";

interface SessionState {
  status: SessionStatus;
  /** Sent in each request; lives only in memory, never in the browser's storage. */
  accessToken: string | null;
  user: AuthenticatedUser | null;
  start: (login: LoginResult) => void;
  /** Keeps the signed-in user's data in step with what was just saved; nothing without a session. */
  updateUser: (changes: Pick<Partial<AuthenticatedUser>, "name" | "email">) => void;
  /** The session is over, or there never was one to restore. */
  expire: () => void;
  /** The person closed the session on purpose. */
  signOut: () => void;
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
  updateUser: (changes) =>
    set((state) => {
      if (!state.user) {
        return {};
      }
      const defined = Object.fromEntries(
        Object.entries(changes).filter(([, value]) => value !== undefined),
      );
      return { user: { ...state.user, ...defined } };
    }),
  expire: () => set({ status: "anonymous", accessToken: null, user: null }),
  signOut: () => set({ status: "signedOut", accessToken: null, user: null }),
  markUnavailable: () => set({ status: "unavailable" }),
  retry: () => set({ status: "loading" }),
}));
