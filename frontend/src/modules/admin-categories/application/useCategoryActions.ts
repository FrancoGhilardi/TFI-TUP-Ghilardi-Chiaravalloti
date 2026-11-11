"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { toast } from "@/modules/core/ui/toast";

import { categoryActionToasts as toasts } from "../content/categories";
import { refusalMessage } from "../domain/refusal-message";
import { adminCategoriesApi } from "../infrastructure/admin-categories-client";

type CategoryAction = "remove" | "restore";

interface CategoryActionRequest {
  id: string;
  action: CategoryAction;
}

/**
 * Logical delete and restore of categories. Each outcome is told in a message (a refusal with the
 * API's reason and how many things block it); whatever it was, the lists and counters that depend
 * on categories are read again. A category with a request on its way ignores any other for itself.
 */
export function useCategoryActions() {
  const queryClient = useQueryClient();
  const inFlight = useRef(new Set<string>());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  const mutation = useMutation({
    mutationFn: ({ id, action }: CategoryActionRequest) =>
      action === "remove" ? adminCategoriesApi.remove(id) : adminCategoriesApi.restore(id),
    onSuccess: (_result, { action }) =>
      toast.success(action === "remove" ? toasts.removed : toasts.restored),
    onError: (error) => toast.error(refusalMessage(error, toasts.failed)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  const start = async (request: CategoryActionRequest) => {
    if (inFlight.current.has(request.id)) {
      return;
    }
    inFlight.current.add(request.id);
    setPending(new Set(inFlight.current));
    try {
      await mutation.mutateAsync(request);
    } catch {
      // Already told by `onError`.
    } finally {
      inFlight.current.delete(request.id);
      setPending(new Set(inFlight.current));
    }
  };

  return {
    remove: (id: string) => start({ id, action: "remove" }),
    restore: (id: string) => start({ id, action: "restore" }),
    isPending: (id: string) => pending.has(id),
  };
}
