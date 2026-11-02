import { cache } from "react";
import { z } from "zod";

import { apiClient, parseResponse } from "@/modules/core/http";

import type { CategoryNode } from "../domain/category";

const CATEGORIES_REVALIDATE_SECONDS = 60;

/** `GET /categories` response node. */
const categoryTreeSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  get children() {
    return z.array(categoryTreeSchema);
  },
});

type CategoryTreeDto = z.infer<typeof categoryTreeSchema>;

function toCategoryNode(dto: CategoryTreeDto): CategoryNode {
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    description: dto.description,
    children: dto.children.map(toCategoryNode),
  };
}

/**
 * Visible category tree; one request per render for the same `timeoutMs`. A caller that can do
 * without the categories passes a short timeout so a slow API does not hold its page.
 */
export const getCategoryTree = cache(async (timeoutMs?: number): Promise<CategoryNode[]> => {
  const body = await apiClient.get<unknown>("/categories", {
    next: { revalidate: CATEGORIES_REVALIDATE_SECONDS },
    timeoutMs,
  });
  return parseResponse(z.array(categoryTreeSchema), body).map(toCategoryNode);
});
