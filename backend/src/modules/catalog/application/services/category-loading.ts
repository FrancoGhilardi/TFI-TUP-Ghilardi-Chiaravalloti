import type { Category } from "../../domain/entities/category.js";
import { ParentCategoryUnavailableError } from "../../domain/errors/parent-category-unavailable-error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { AdminCategoryResult } from "../dto/admin-category.result.js";
import { CategoryNotFoundError } from "../errors/category-not-found-error.js";
import type { CategoryQueries } from "../ports/category-queries.js";

/** The category, deleted or not; an unknown one is a 404. Inside a transaction it is locked. */
export async function loadCategory(categories: CategoryRepository, id: string): Promise<Category> {
  const category = await categories.findById(id);
  if (!category) {
    throw new CategoryNotFoundError();
  }
  return category;
}

/**
 * Whether the category can hang from that parent: it has to exist and not be deleted, active
 * or not. Inside a transaction the parent stays locked, so it cannot be deleted meanwhile.
 */
export async function isParentAvailable(
  categories: CategoryRepository,
  parentId: string,
): Promise<boolean> {
  const parent = await categories.findById(parentId);
  return parent !== null && !parent.isDeleted();
}

export async function assertParentAvailable(
  categories: CategoryRepository,
  parentId: string,
): Promise<void> {
  if (!(await isParentAvailable(categories, parentId))) {
    throw new ParentCategoryUnavailableError();
  }
}

/** The category as the panel shows it, once a change is committed. */
export async function adminResultOf(
  queries: CategoryQueries,
  id: string,
): Promise<AdminCategoryResult> {
  const result = await queries.findAdminById(id);
  if (!result) {
    throw new CategoryNotFoundError();
  }
  return result;
}
