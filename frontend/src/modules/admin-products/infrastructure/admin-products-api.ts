import { z } from "zod";

import { type ApiClient, parseResponse } from "@/modules/core/http";

import type { AdminProductSummary } from "../domain/admin-product";

/** `AdminProductPageResponseDto` of the API, with what the panel's summaries need. */
const productPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      sku: z.string(),
      title: z.string(),
      stock: z.number(),
      isActive: z.boolean(),
      thumbnail: z.object({ url: z.string().nullable() }).nullable(),
      updatedAt: z.coerce.date(),
    }),
  ),
  totalItems: z.number(),
});

export interface AdminProductsQuery {
  /** Without it the API lists the products that are not deleted. */
  status?: "ACTIVE" | "INACTIVE";
  maxStock?: number;
  sortBy?: "STOCK" | "UPDATED_AT";
  sortDir?: "ASC" | "DESC";
  limit: number;
}

export interface AdminProductsPage {
  /** How many products match, whatever the page size. */
  total: number;
  items: AdminProductSummary[];
}

export function createAdminProductsApi(client: ApiClient) {
  return {
    /** `GET /admin/products`: the first products that match, and how many there are in all. */
    async list(query: AdminProductsQuery, signal?: AbortSignal): Promise<AdminProductsPage> {
      const body = await client.get<unknown>("/admin/products", { query: { ...query }, signal });
      const { items, totalItems } = parseResponse(productPageSchema, body);
      return {
        total: totalItems,
        items: items.map(({ thumbnail, ...product }) => ({
          ...product,
          thumbnailUrl: thumbnail?.url ?? null,
        })),
      };
    },
  };
}
