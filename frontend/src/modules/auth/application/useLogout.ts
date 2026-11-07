"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { ADMIN_PATHS } from "../domain/routes";
import { authApi } from "../infrastructure/auth-api";
import { useSessionStore } from "./session-store";

/**
 * Closes the panel session. It ends here at once, whatever the API answers: the state is cleared
 * before the API is told (so the token cannot be used while it answers) and then nothing fetched
 * for the person stays in memory and they go to sign in. If the API could not be told, the
 * refresh cookie expires on its own.
 */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const signOut = useSessionStore((state) => state.signOut);

  const mutation = useMutation({
    onMutate: signOut,
    mutationFn: () => authApi.logout().catch(() => undefined),
    onSuccess: () => {
      // After the panel screens are gone, or one that is still mounted would fetch again.
      queryClient.removeQueries();
      router.replace(ADMIN_PATHS.login);
    },
  });

  // Asked once: two clicks before the screen re-renders must not close the session twice.
  const asked = useRef(false);
  const logout = () => {
    if (!asked.current) {
      asked.current = true;
      mutation.mutate();
    }
  };

  // Stays busy after success: the page is on its way out.
  return { logout, isBusy: mutation.isPending || mutation.isSuccess };
}
