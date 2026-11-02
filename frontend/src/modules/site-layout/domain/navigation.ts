export interface NavItem {
  label: string;
  href: string;
}

export const HOME: NavItem = { label: "Inicio", href: "/" };
export const PRODUCTS: NavItem = { label: "Productos", href: "/productos" };
export const ABOUT: NavItem = { label: "Sobre nosotros", href: "/sobre-nosotros" };

/** How many first-level categories the footer lists under "Tienda". */
export const FOOTER_CATEGORY_LIMIT = 4;

/** Viewport from which the header shows its full navigation; matches `--breakpoint-nav` in globals.css. */
export const DESKTOP_NAV_MEDIA_QUERY = "(min-width: 861px)";

/** The navigation can do without categories, so it waits for them only this long. */
export const NAV_CATEGORIES_TIMEOUT_MS = 3000;

export function categoryHref(slug: string): string {
  return `${PRODUCTS.href}?categoria=${encodeURIComponent(slug)}`;
}

/** Whether `href` is the section the visitor is in: home only on itself, the rest with their subpages. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === HOME.href) {
    return pathname === HOME.href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
