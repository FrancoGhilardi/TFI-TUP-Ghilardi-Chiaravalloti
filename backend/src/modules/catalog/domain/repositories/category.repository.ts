import type { Slug } from "../../../../shared/domain/value-objects/slug.js";
import type { Category } from "../entities/category.js";

/** Loads and stores categories. "Current" ones are not deleted. */
export abstract class CategoryRepository {
  /**
   * The category with that id, deleted or not, or `null`. Inside a transaction its row stays
   * locked until the end, so a change to it, or to what hangs from it, waits.
   */
  abstract findById(id: string): Promise<Category | null>;

  /** The categories among `ids` that are active and current. */
  abstract findVisibleByIds(ids: string[]): Promise<Category[]>;

  /** Whether a current category other than `excludeId` has that name, ignoring case. */
  abstract existsByName(name: string, excludeId?: string): Promise<boolean>;

  /** Whether any category, deleted or not, has that slug. */
  abstract existsBySlug(slug: Slug): Promise<boolean>;

  /** The ids above the category, from its parent up to the root. */
  abstract findAncestorIds(id: string): Promise<string[]>;

  /** Subcategories not deleted, active or not. */
  abstract countCurrentChildren(id: string): Promise<number>;

  /** Current products whose only category is this one. */
  abstract countProductsWhereOnlyCategory(id: string): Promise<number>;

  /**
   * Makes moves, restores and deletions run one at a time, until the transaction ends: two
   * moves at once could otherwise close a loop or lock the same rows in opposite order, and
   * two deletions could leave a product without a current category. Only inside a
   * transaction, and before reading any category.
   */
  abstract lockHierarchy(): Promise<void>;

  abstract save(category: Category): Promise<void>;
}
