import { z } from "zod";

import { type ApiClient, parseResponse } from "@/modules/core/http";

import type { AdminProductRow } from "../domain/admin-product";
import type { ProductsApiParams } from "../domain/products-query";

/** `AdminProductPageResponseDto` of the API, with what the panel's lists show. */
const productPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      sku: z.string(),
      title: z.string(),
      slug: z.string(),
      price: z.string(),
      salePrice: z.string().nullable(),
      stock: z.number(),
      isActive: z.boolean(),
      isFeatured: z.boolean(),
      isNew: z.boolean(),
      isOnSale: z.boolean(),
      primaryCategory: z.object({ id: z.string(), name: z.string() }).nullable(),
      thumbnail: z.object({ url: z.string().nullable() }).nullable(),
      updatedAt: z.coerce.date(),
      deletedAt: z.string().pipe(z.coerce.date()).nullable(),
    }),
  ),
  totalItems: z.number(),
});

export interface AdminProductsPage {
  /** How many products match, whatever the page size. */
  total: number;
  items: AdminProductRow[];
}

export function createAdminProductsApi(client: ApiClient) {
  const pathOf = (id: string) => `/admin/products/${encodeURIComponent(id)}`;

  return {
    /** `GET /admin/products`: the products that match, and how many there are in all. */
    async list(query: ProductsApiParams, signal?: AbortSignal): Promise<AdminProductsPage> {
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

    /** `DELETE /admin/products/{id}`: logical delete; deleting one already deleted changes nothing. */
    async remove(id: string, signal?: AbortSignal): Promise<void> {
      await client.delete<void>(pathOf(id), { signal });
    },

    /** `POST /admin/products/{id}/restore`: the product comes back as it was; its answer is not read. */
    async restore(id: string, signal?: AbortSignal): Promise<void> {
      await client.post<unknown>(`${pathOf(id)}/restore`, { signal });
    },
  };
}
