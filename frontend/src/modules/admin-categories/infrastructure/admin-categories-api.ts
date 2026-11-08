import { z } from "zod";

import { type ApiClient, parseResponse } from "@/modules/core/http";

/** `AdminCategoryPageResponseDto` of the API; only the total is read. */
const categoryPageSchema = z.object({ totalItems: z.number() });

export function createAdminCategoriesApi(client: ApiClient) {
  return {
    /**
     * `GET /admin/categories`: how many categories there are. Without a `status` the API counts
     * the ones that are not deleted.
     */
    async count(status?: "ACTIVE" | "INACTIVE", signal?: AbortSignal): Promise<number> {
      const body = await client.get<unknown>("/admin/categories", {
        query: { status, limit: 1 },
        signal,
      });
      return parseResponse(categoryPageSchema, body).totalItems;
    },
  };
}
