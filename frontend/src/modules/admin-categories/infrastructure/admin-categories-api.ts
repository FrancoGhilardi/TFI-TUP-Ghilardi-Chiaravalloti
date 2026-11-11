import { z } from "zod";

import { type ApiClient, parseResponse } from "@/modules/core/http";

import type { AdminCategoryRow } from "../domain/admin-category";
import type { CategoriesApiParams } from "../domain/categories-query";
import { type CategoryOption, categoryOptionOf } from "../domain/category-option";
import type { CreateCategoryRequest, UpdateCategoryRequest } from "../domain/category-request";

/** `AdminCategoryPageResponseDto` of the API; only the total is read. */
const categoryPageSchema = z.object({ totalItems: z.number() });

/** The same page with what the products filter needs of each category. */
const categoryListSchema = z.object({
  items: z.array(
    z.object({ id: z.string(), name: z.string(), depth: z.number(), isActive: z.boolean() }),
  ),
  totalPages: z.number(),
});

const dateOrNull = z.string().pipe(z.coerce.date()).nullable();

/** `AdminCategoryResponseDto` of the API. */
const categoryRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  parent: z.object({ id: z.string(), name: z.string(), slug: z.string() }).nullable(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  depth: z.number(),
  productCount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: dateOrNull,
});

const categoryRowsSchema = z.object({
  items: z.array(categoryRowSchema),
  totalItems: z.number(),
});

export interface AdminCategoriesPage {
  /** How many categories match, whatever the page size. */
  total: number;
  items: AdminCategoryRow[];
}

const PAGE_SIZE = 100;
/** Pages read at most: a catalog with more categories than this is cut off. */
const MAX_PAGES = 20;

export function createAdminCategoriesApi(client: ApiClient) {
  const pathOf = (id: string) => `/admin/categories/${encodeURIComponent(id)}`;

  return {
    /**
     * `GET /admin/categories`: the categories that match. Without a search or a parent they come
     * in tree order (each one after its parent) with their `depth`; with either, flat by name.
     */
    async list(params: CategoriesApiParams, signal?: AbortSignal): Promise<AdminCategoriesPage> {
      const body = await client.get<unknown>("/admin/categories", { query: { ...params }, signal });
      const { items, totalItems } = parseResponse(categoryRowsSchema, body);
      return { total: totalItems, items };
    },

    /** `GET /admin/categories/{id}`: a category as the form shows it, also when it is deleted. */
    async get(id: string, signal?: AbortSignal): Promise<AdminCategoryRow> {
      const body = await client.get<unknown>(pathOf(id), { signal });
      return parseResponse(categoryRowSchema, body);
    },

    /** `POST /admin/categories`: the answer is not read, since once it answers the category exists. */
    async create(request: CreateCategoryRequest, signal?: AbortSignal): Promise<void> {
      await client.post<unknown>("/admin/categories", { body: request, signal });
    },

    /** `PATCH /admin/categories/{id}`: only what is sent changes; `parentId: null` moves it to the root. */
    async update(id: string, changes: UpdateCategoryRequest, signal?: AbortSignal): Promise<void> {
      await client.patch<unknown>(pathOf(id), { body: changes, signal });
    },

    /** `DELETE /admin/categories/{id}`: logical delete; deleting one already deleted changes nothing. */
    async remove(id: string, signal?: AbortSignal): Promise<void> {
      await client.delete<void>(pathOf(id), { signal });
    },

    /** `POST /admin/categories/{id}/restore`: the category comes back with the state it had. */
    async restore(id: string, signal?: AbortSignal): Promise<void> {
      await client.post<unknown>(`${pathOf(id)}/restore`, { signal });
    },

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
