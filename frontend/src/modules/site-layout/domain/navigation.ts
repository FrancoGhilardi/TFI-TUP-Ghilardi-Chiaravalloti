import { CATALOG_PATH } from "@/modules/catalog";

export interface NavItem {
  label: string;
  href: string;
}

export const HOME: NavItem = { label: "Inicio", href: "/" };
export const PRODUCTS: NavItem = { label: "Productos", href: CATALOG_PATH };
export const ABOUT: NavItem = { label: "Sobre nosotros", href: "/sobre-nosotros" };

/** How many first-level categories the footer lists under "Tienda". */
export const FOOTER_CATEGORY_LIMIT = 4;

/** Viewport from which the header shows its full navigation; matches `--breakpoint-nav` in globals.css. */
export const DESKTOP_NAV_MEDIA_QUERY = "(min-width: 861px)";

/** Whether `href` is the section the visitor is in: home only on itself, the rest with their subpages. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === HOME.href) {
    return pathname === HOME.href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
