import type { AdminUserRow } from "./admin-user";

export type UserState = "active" | "inactive" | "deleted";

/** Where a user stands: deleted wins over inactive, as a deleted one cannot be edited. */
export function userState({
  deletedAt,
  isActive,
}: Pick<AdminUserRow, "deletedAt" | "isActive">): UserState {
  if (deletedAt) {
    return "deleted";
  }
  return isActive ? "active" : "inactive";
}
