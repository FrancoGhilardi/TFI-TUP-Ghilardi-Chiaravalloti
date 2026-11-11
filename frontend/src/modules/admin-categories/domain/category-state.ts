import type { AdminCategoryRow } from "./admin-category";

export type CategoryState = "active" | "inactive" | "deleted";

/** Where a category stands: deleted wins over inactive, as a deleted one cannot be edited. */
export function categoryState({
  deletedAt,
  isActive,
}: Pick<AdminCategoryRow, "deletedAt" | "isActive">): CategoryState {
  if (deletedAt) {
    return "deleted";
  }
  return isActive ? "active" : "inactive";
}
