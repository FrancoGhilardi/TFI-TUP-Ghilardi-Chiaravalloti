import { z } from "zod";

import { type ApiClient, parseResponse } from "@/modules/core/http";

import { type CategoryOption, categoryOptionOf } from "../domain/category-option";

/** `AdminCategoryPageResponseDto` of the API; only the total is read. */
const categoryPageSchema = z.object({ totalItems: z.number() });

/** The same page with what the products filter needs of each category. */
const categoryListSchema = z.object({
  items: z.array(
    z.object({ id: z.string(), name: z.string(), depth: z.number(), isActive: z.boolean() }),
  ),
  totalPages: z.number(),
});

const PAGE_SIZE = 100;
/** Pages read at most: a catalog with more categories than this is cut off. */
const MAX_PAGES = 20;

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

    /**
     * `GET /admin/categories`: every category that is not deleted, in tree order (each one right
     * after its parent), reading the pages one after the other.
     */
    async listAll(signal?: AbortSignal): Promise<CategoryOption[]> {
      const options: CategoryOption[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const body = await client.get<unknown>("/admin/categories", {
          query: { page, limit: PAGE_SIZE },
          signal,
        });
        const { items, totalPages } = parseResponse(categoryListSchema, body);
        options.push(...items.map(categoryOptionOf));
        if (page >= totalPages) {
          break;
        }
      }
      return options;
    },
  };
}
