import type { AdminProductRow } from "./admin-product";

export type ProductState = "active" | "inactive" | "deleted";

/** Where a product stands: deleted wins over inactive, as a deleted product cannot be edited. */
export function productState({
  deletedAt,
  isActive,
}: Pick<AdminProductRow, "deletedAt" | "isActive">): ProductState {
  if (deletedAt) {
    return "deleted";
  }
  return isActive ? "active" : "inactive";
}
