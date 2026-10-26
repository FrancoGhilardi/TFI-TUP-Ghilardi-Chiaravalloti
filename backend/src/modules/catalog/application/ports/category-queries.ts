import type { CategoryTreeRow } from "../services/category-tree.js";

/** Reads categories as each screen needs them, without loading entities. */
export abstract class CategoryQueries {
  /** Every category that is active and not deleted, in no particular order. */
  abstract findVisibleRows(): Promise<CategoryTreeRow[]>;
}
