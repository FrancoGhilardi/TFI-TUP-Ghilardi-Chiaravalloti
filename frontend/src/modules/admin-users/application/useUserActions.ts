"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useInFlight } from "@/modules/core/hooks/useInFlight";
import { ApiError } from "@/modules/core/http";
import { toast } from "@/modules/core/ui/toast";

import { userActionToasts as toasts } from "../content/users";
import { adminUsersApi } from "../infrastructure/admin-users-client";

type UserAction = "remove" | "restore" | "resetPassword";

interface UserActionRequest {
  id: string;
  action: UserAction;
}

const SUCCESS: Record<UserAction, string> = {
  remove: toasts.removed,
  restore: toasts.restored,
  resetPassword: toasts.passwordSent,
};

/**
 * Logical delete, restore and temporary password of users. Each outcome is told in a message (a
 * refusal with the API's reason); whatever it was, the lists and counters that depend on users
 * are read again. A user with a request on its way ignores any other for itself.
 */
export function useUserActions() {
  const queryClient = useQueryClient();
  const { run, isPending } = useInFlight();

  const mutation = useMutation({
    mutationFn: ({ id, action }: UserActionRequest) => adminUsersApi[action](id),
    onSuccess: (_result, { action }) => toast.success(SUCCESS[action]),
    onError: (error) => toast.error(error instanceof ApiError ? error.message : toasts.failed),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const start = (request: UserActionRequest) =>
    run(request.id, async () => {
      try {
        await mutation.mutateAsync(request);
      } catch {
        // Already told by `onError`.
      }
    });

  return {
    remove: (id: string) => start({ id, action: "remove" }),
    restore: (id: string) => start({ id, action: "restore" }),
    resetPassword: (id: string) => start({ id, action: "resetPassword" }),
    isPending,
  };
}
