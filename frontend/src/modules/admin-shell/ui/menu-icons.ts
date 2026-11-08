import { House, type LucideIcon, Package, Store, Tag, User, Users } from "lucide-react";

import type { MenuItemId } from "../domain/menu";

/** The icon of each menu entry; the menu itself is data and knows nothing of drawing. */
export const MENU_ICONS: Record<MenuItemId, LucideIcon> = {
  home: House,
  products: Package,
  categories: Tag,
  users: Users,
  account: User,
  store: Store,
};
