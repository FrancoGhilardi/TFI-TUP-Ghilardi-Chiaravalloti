import { useCategoriesTotal } from "@/modules/admin-categories";
import { useProductsTotal } from "@/modules/admin-products";
import { useUsersTotal } from "@/modules/admin-users";
import type { UserRole } from "@/modules/auth";

import type { MenuItemId } from "../domain/menu";

/**
 * The numbers shown next to the menu entries. An entry whose number is not there (still loading,
 * or the API failed) simply has none: the menu never waits for them nor shows an error.
 */
export function useMenuCounts(role: UserRole): Partial<Record<MenuItemId, number>> {
  const products = useProductsTotal().data;
  const categories = useCategoriesTotal().data;
  const users = useUsersTotal({ enabled: role === "ADMIN" }).data;
  return { products, categories, users };
}
