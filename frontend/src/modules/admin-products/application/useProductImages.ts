import { useQuery } from "@tanstack/react-query";

import { adminProductImagesApi } from "../infrastructure/admin-product-images-client";

/** How often the images are read while some are still being processed. */
const POLL_MS = 3000;

/** The images of a product, read again every few seconds as long as one is still processing. */
export function useProductImages(productId: string) {
  return useQuery({
    queryKey: ["admin-products", "images", productId],
    queryFn: ({ signal }) => adminProductImagesApi.list(productId, signal),
    refetchInterval: (query) =>
      query.state.data?.some(({ status }) => status === "PENDING") ? POLL_MS : false,
  });
}
