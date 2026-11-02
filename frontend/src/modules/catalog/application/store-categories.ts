import { OPTIONAL_READ_TIMEOUT_MS, recoverFromApiError } from "@/modules/core/http";

import { type CategoryNode, rootCategories } from "../domain/category";
import { getCategoryTree } from "../infrastructure/categories-api";

/**
 * The category tree for store pages that can render without it (navigation, home, catalog): a
 * short wait, and an API failure or a timeout means no categories. Every store read goes through
 * here, so the tree is requested once per render.
 */
export function getStoreCategoryTree(): Promise<CategoryNode[]> {
  return recoverFromApiError(() => getCategoryTree(OPTIONAL_READ_TIMEOUT_MS), []);
}

/** First-level categories of that same tree, without their subtrees. */
export async function getStoreRootCategories(): Promise<CategoryNode[]> {
  return rootCategories(await getStoreCategoryTree());
}
