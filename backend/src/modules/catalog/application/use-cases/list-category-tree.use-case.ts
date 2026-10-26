import type { UseCase } from "../../../../shared/application/use-case.js";
import type { CategoryTreeResult } from "../dto/category-tree.result.js";
import type { CategoryQueries } from "../ports/category-queries.js";
import { buildCategoryTree } from "../services/category-tree.js";

/**
 * The category tree of the store, for its menu, filters and footer. A category shows only
 * when it and every category above it are active and not deleted.
 */
export class ListCategoryTreeUseCase implements UseCase<void, CategoryTreeResult[]> {
  constructor(private readonly queries: CategoryQueries) {}

  async execute(): Promise<CategoryTreeResult[]> {
    return buildCategoryTree(await this.queries.findVisibleRows());
  }
}
