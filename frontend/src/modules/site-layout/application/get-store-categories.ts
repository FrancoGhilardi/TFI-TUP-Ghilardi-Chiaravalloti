import { type CategoryNode, getCategoryTree, rootCategories } from "@/modules/catalog";
import { ApiError } from "@/modules/core/http";

import { NAV_CATEGORIES_TIMEOUT_MS } from "../domain/navigation";

/**
 * First-level categories for the store navigation. The layout must render even when the API is
 * down or slow, so an API failure or a timeout means no categories rather than an error page.
 */
export async function getStoreCategories(): Promise<CategoryNode[]> {
  try {
    return rootCategories(await getCategoryTree(NAV_CATEGORIES_TIMEOUT_MS));
  } catch (error) {
    if (error instanceof ApiError) {
      return [];
    }
    throw error;
  }
}
