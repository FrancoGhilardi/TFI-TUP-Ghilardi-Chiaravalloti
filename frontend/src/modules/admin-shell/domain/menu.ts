import { ADMIN_PATHS, canOpenPanelPath, type UserRole } from "@/modules/auth";

import { shellContent } from "../content/shell";

export type MenuItemId = keyof typeof shellContent.menu;
export type MenuGroup = keyof typeof shellContent.groups;

export interface MenuItem {
  id: MenuItemId;
  label: string;
  href: string;
  group: MenuGroup;
  /** Leaves the panel (opens in another tab) instead of being a screen of it. */
  external?: boolean;
}

export interface MenuSection {
  group: MenuGroup;
  label: string;
  items: MenuItem[];
}

const item = (id: MenuItemId, href: string, group: MenuGroup, external?: boolean): MenuItem => ({
  id,
  label: shellContent.menu[id],
  href,
  group,
  external,
});

/** Every entry of the panel's menu, in the order they are shown. */
const MENU: readonly MenuItem[] = [
  item("home", ADMIN_PATHS.home, "catalog"),
  item("products", ADMIN_PATHS.products, "catalog"),
  item("categories", ADMIN_PATHS.categories, "catalog"),
  item("users", ADMIN_PATHS.users, "admin"),
  item("account", ADMIN_PATHS.account, "account"),
  item("store", "/", "account", true),
];

const GROUPS: readonly MenuGroup[] = ["catalog", "admin", "account"];

/** The menu a role sees: what its role may open, grouped, without empty groups. */
export function menuFor(role: UserRole): MenuSection[] {
  const allowed = MENU.filter(({ href }) => canOpenPanelPath(role, href));
  return GROUPS.map((group) => ({
    group,
    label: shellContent.groups[group],
    items: allowed.filter((entry) => entry.group === group),
  })).filter(({ items }) => items.length > 0);
}

/** Whether the screen at `pathname` is the one `href` leads to, or something inside it. */
export function isActiveItem(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Name of the screen at `pathname`, for the breadcrumb. */
export function pageTitle(pathname: string): string {
  const current = MENU.find(({ href, external }) => !external && isActiveItem(pathname, href));
  return current?.label ?? shellContent.defaultTitle;
}
