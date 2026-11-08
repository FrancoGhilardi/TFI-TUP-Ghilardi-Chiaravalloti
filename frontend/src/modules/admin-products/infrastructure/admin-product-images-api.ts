import { z } from "zod";

import { type ApiClient, parseResponse } from "@/modules/core/http";

import type { AdminProductImage } from "../domain/admin-product";
import { imageSchema } from "./admin-product-image-schema";

/** Uploading an image of 10 MB takes longer than the usual deadline of a call. */
const UPLOAD_TIMEOUT_MS = 60_000;

const imagesSchema = z.array(imageSchema);

export function createAdminProductImagesApi(client: ApiClient) {
  const base = (productId: string) => `/admin/products/${encodeURIComponent(productId)}/images`;
  const one = (productId: string, imageId: string) =>
    `${base(productId)}/${encodeURIComponent(imageId)}`;

  return {
    /** `GET …/images`: by position, with the state of each and a link to see the original. */
    async list(productId: string, signal?: AbortSignal): Promise<AdminProductImage[]> {
      const body = await client.get<unknown>(base(productId), { signal });
      return parseResponse(imagesSchema, body);
    },

    /** `POST …/images`: one more image, which then waits to be processed. */
    async add(
      productId: string,
      image: File,
      altText: string,
      signal?: AbortSignal,
    ): Promise<void> {
      const form = new FormData();
      form.append("image", image);
      if (altText.trim()) {
        form.append("altText", altText.trim());
      }
      await client.post<unknown>(base(productId), {
        body: form,
        timeoutMs: UPLOAD_TIMEOUT_MS,
        signal,
      });
    },

    /** `PATCH …/images/order`: every image of the product, in the order they should have. */
    async reorder(productId: string, imageIds: string[], signal?: AbortSignal): Promise<void> {
      await client.patch<unknown>(`${base(productId)}/order`, { body: { imageIds }, signal });
    },

    /** `PATCH …/images/{id}`: an empty text takes the alternative text away. */
    async changeAltText(
      productId: string,
      imageId: string,
      altText: string,
      signal?: AbortSignal,
    ): Promise<void> {
      await client.patch<unknown>(one(productId, imageId), {
        body: { altText: altText.trim() },
        signal,
      });
    },

    /** `PUT …/images/{id}/file`: a new file for the image, which goes back to processing. */
    async replaceFile(
      productId: string,
      imageId: string,
      image: File,
      signal?: AbortSignal,
    ): Promise<void> {
      const form = new FormData();
      form.append("image", image);
      await client.put<unknown>(`${one(productId, imageId)}/file`, {
        body: form,
        timeoutMs: UPLOAD_TIMEOUT_MS,
        signal,
      });
    },

    /** `POST …/images/{id}/retry`: processes again an image that failed. */
    async retry(productId: string, imageId: string, signal?: AbortSignal): Promise<void> {
      await client.post<unknown>(`${one(productId, imageId)}/retry`, { signal });
    },

    /** `DELETE …/images/{id}`: never the last one of a product. */
    async remove(productId: string, imageId: string, signal?: AbortSignal): Promise<void> {
      await client.delete<void>(one(productId, imageId), { signal });
    },
  };
}
