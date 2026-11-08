import { z } from "zod";

import { type ApiClient, parseResponse } from "@/modules/core/http";

import type { AdminProductDetail, AdminProductRow } from "../domain/admin-product";
import type { CreateProductRequest, UpdateProductRequest } from "../domain/product-request";
import type { ProductsApiParams } from "../domain/products-query";
import { imageSchema } from "./admin-product-image-schema";

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

const dateOrNull = z.string().pipe(z.coerce.date()).nullable();
const userSummary = z.object({ id: z.string(), name: z.string() }).nullable();

/** `AdminProductDetailResponseDto` of the API. */
const productDetailSchema = z.object({
  id: z.string(),
  sku: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  price: z.string(),
  salePrice: z.string().nullable(),
  saleEndsAt: dateOrNull,
  stock: z.number(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  isOnSale: z.boolean(),
  isNew: z.boolean(),
  newUntil: dateOrNull,
  primaryCategoryId: z.string(),
  categories: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
  relatedProducts: z.array(
    z.object({ id: z.string(), title: z.string(), sku: z.string(), slug: z.string() }),
  ),
  images: z.array(imageSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: dateOrNull,
  createdBy: userSummary,
  updatedBy: userSummary,
});

/** Uploading up to five images of 10 MB takes longer than the usual deadline of a call. */
const UPLOAD_TIMEOUT_MS = 120_000;

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

    /** `GET /admin/products/{id}`: the product as the form shows it, also when it is deleted. */
    async get(id: string, signal?: AbortSignal): Promise<AdminProductDetail> {
      const body = await client.get<unknown>(pathOf(id), { signal });
      return parseResponse(productDetailSchema, body);
    },

    /**
     * `POST /admin/products`: the product and its first images in one `multipart/form-data`
     * request. What the API answers is not read: once it answers, the product exists.
     */
    async create(
      request: CreateProductRequest,
      images: readonly File[],
      signal?: AbortSignal,
    ): Promise<void> {
      const form = new FormData();
      form.append("data", JSON.stringify(request));
      for (const image of images) {
        form.append("images", image);
      }
      await client.post<unknown>("/admin/products", {
        body: form,
        timeoutMs: UPLOAD_TIMEOUT_MS,
        signal,
      });
    },

    /** `PATCH /admin/products/{id}`: only what is sent changes. The answer is not read. */
    async update(id: string, changes: UpdateProductRequest, signal?: AbortSignal): Promise<void> {
      await client.patch<unknown>(pathOf(id), { body: changes, signal });
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
