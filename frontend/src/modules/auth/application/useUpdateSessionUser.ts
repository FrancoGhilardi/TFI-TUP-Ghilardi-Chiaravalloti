import { useSessionStore } from "./session-store";

/** Updates the name and email of the signed-in user after they were edited. */
export function useUpdateSessionUser() {
  return useSessionStore((state) => state.updateUser);
}
