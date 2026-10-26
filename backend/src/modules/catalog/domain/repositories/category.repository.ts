import type { Slug } from "../../../../shared/domain/value-objects/slug.js";
import type { Category } from "../entities/category.js";

/** Loads and stores categories. "Current" ones are not deleted. */
export abstract class CategoryRepository {
  /** The category with that id, deleted or not, or `null`. */
  abstract findById(id: string): Promise<Category | null>;

  /** The categories among `ids` that are active and current. */
  abstract findVisibleByIds(ids: string[]): Promise<Category[]>;

  /** Whether a current category other than `excludeId` has that name, ignoring case. */
  abstract existsByName(name: string, excludeId?: string): Promise<boolean>;

  abstract existsBySlug(slug: Slug): Promise<boolean>;

  /** The ids above the category, from its parent up to the root. */
  abstract findAncestorIds(id: string): Promise<string[]>;

  abstract countActiveChildren(id: string): Promise<number>;

  /** Current products whose only category is this one. */
  abstract countProductsWhereOnlyCategory(id: string): Promise<number>;

  abstract save(category: Category): Promise<void>;
}
