import type { AuthenticatedUser } from "../domain/user";
import { useSessionStore } from "./session-store";

/** Who is signed in to the panel, or `null` when nobody is. */
export function useSessionUser(): AuthenticatedUser | null {
  return useSessionStore((state) => state.user);
}
