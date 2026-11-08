"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { ApiError } from "@/modules/core/http";
import { toast } from "@/modules/core/ui/toast";

import { productsContent } from "../content/products";
import { adminProductsApi } from "../infrastructure/admin-products-client";

type ProductAction = "remove" | "restore";

interface ProductActionRequest {
  id: string;
  action: ProductAction;
}

const { toasts } = productsContent;

/**
 * Logical delete and restore of products. Each outcome is told in a message; whatever it was, the
 * lists and counters that depend on products are read again. A product with a request on its way
 * ignores any other for the same product.
 */
export function useProductActions() {
  const queryClient = useQueryClient();
  const inFlight = useRef(new Set<string>());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  const mutation = useMutation({
    mutationFn: ({ id, action }: ProductActionRequest) =>
      action === "remove" ? adminProductsApi.remove(id) : adminProductsApi.restore(id),
    onSuccess: (_result, { action }) =>
      toast.success(action === "remove" ? toasts.removed : toasts.restored),
    onError: (error) => toast.error(error instanceof ApiError ? error.message : toasts.failed),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const start = async (request: ProductActionRequest) => {
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
