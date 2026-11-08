"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { ApiError } from "@/modules/core/http";
import { toast } from "@/modules/core/ui/toast";

import { productFormToasts } from "../content/product-form";
import { adminProductImagesApi as api } from "../infrastructure/admin-product-images-client";

const { images: messages } = productFormToasts;

/** What is asked of one image, or of the whole set (`imageId` empty). */
interface ImageTask {
  imageId: string;
  run: () => Promise<void>;
  success: string;
}

/**
 * The actions on the saved images of a product. Each one is sent at once and its outcome told in a
 * message; the images are read again afterwards. An image with a request on its way ignores any
 * other for itself.
 */
export function useImageActions(productId: string) {
  const queryClient = useQueryClient();
  const inFlight = useRef(new Set<string>());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  const mutation = useMutation({
    mutationFn: ({ run }: ImageTask) => run(),
    onSuccess: (_result, { success }) => toast.success(success),
    onError: (error) => toast.error(error instanceof ApiError ? error.message : messages.failed),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-products", "images", productId] }),
  });

  const start = async (task: ImageTask) => {
    if (inFlight.current.has(task.imageId)) {
      return;
    }
    inFlight.current.add(task.imageId);
    setPending(new Set(inFlight.current));
    try {
      await mutation.mutateAsync(task);
    } catch {
      // Already told by `onError`.
    } finally {
      inFlight.current.delete(task.imageId);
      setPending(new Set(inFlight.current));
    }
  };

  return {
    add: (file: File, altText: string) =>
      start({ imageId: "", run: () => api.add(productId, file, altText), success: messages.added }),
    replace: (imageId: string, file: File) =>
      start({
        imageId,
        run: () => api.replaceFile(productId, imageId, file),
        success: messages.replaced,
      }),
    reorder: (imageIds: string[]) =>
      start({
        imageId: "",
        run: () => api.reorder(productId, imageIds),
        success: messages.reordered,
      }),
    changeAltText: (imageId: string, altText: string) =>
      start({
        imageId,
        run: () => api.changeAltText(productId, imageId, altText),
        success: messages.altChanged,
      }),
    retry: (imageId: string) =>
      start({ imageId, run: () => api.retry(productId, imageId), success: messages.retried }),
    remove: (imageId: string) =>
      start({ imageId, run: () => api.remove(productId, imageId), success: messages.removed }),
    /** Something is being asked of some image, or of the whole set. */
    isBusy: pending.size > 0,
    /** A request for this image (`""`: for the whole set, such as adding or reordering) is on its way. */
    isPending: (imageId: string) => pending.has(imageId),
  };
}
