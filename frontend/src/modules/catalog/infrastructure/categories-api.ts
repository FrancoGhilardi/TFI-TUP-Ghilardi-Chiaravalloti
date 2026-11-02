import { cache } from "react";

import { apiClient } from "@/modules/core/http";

import type { CategoryNode } from "../domain/category";

const CATEGORIES_REVALIDATE_SECONDS = 60;

/** `GET /categories` response node. */
interface CategoryTreeDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  children: CategoryTreeDto[];
}

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
  const tree = await apiClient.get<CategoryTreeDto[]>("/categories", {
    next: { revalidate: CATEGORIES_REVALIDATE_SECONDS },
    timeoutMs,
  });
  return tree.map(toCategoryNode);
});
