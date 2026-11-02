import { OPTIONAL_READ_TIMEOUT_MS, recoverFromApiError } from "@/modules/core/http";

import { type CategoryNode, rootCategories } from "../domain/category";
import { getCategoryTree } from "../infrastructure/categories-api";

/**
 * First-level categories for store pages that can render without them (navigation, home): a
 * short wait, and an API failure or a timeout means no categories. Every caller shares this
 * function, so the tree is requested once per render.
 */
export function getStoreRootCategories(): Promise<CategoryNode[]> {
  return recoverFromApiError(
    async () => rootCategories(await getCategoryTree(OPTIONAL_READ_TIMEOUT_MS)),
    [],
  );
}
