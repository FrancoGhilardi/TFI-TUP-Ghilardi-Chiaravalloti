import type { Page } from "../../../../shared/application/pagination.js";
import type { AdminCategoryResult } from "../dto/admin-category.result.js";
import type { ListAdminCategoriesQuery } from "../dto/list-admin-categories.query.js";
import type { CategoryTreeRow } from "../services/category-tree.js";

/** Reads categories as each screen needs them, without loading entities. */
export abstract class CategoryQueries {
  /** Every category that is active and not deleted, in no particular order. */
  abstract findVisibleRows(): Promise<CategoryTreeRow[]>;

  abstract findAdminPage(query: ListAdminCategoriesQuery): Promise<Page<AdminCategoryResult>>;

  /** The category with that id, deleted or not, or `null`. */
  abstract findAdminById(id: string): Promise<AdminCategoryResult | null>;
}
