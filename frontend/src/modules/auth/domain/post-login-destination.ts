import { canOpenPanelPath, isWithin } from "./panel-access";
import { ADMIN_PATHS } from "./routes";
import type { AuthenticatedUser } from "./user";

// Sentinel origin to read a path the way a browser would, whatever it looks like.
const BASE = "http://panel.invalid";

/** Screens a signed-in person never lands on by a `next` address. */
const AUTH_SCREENS: string[] = [
  ADMIN_PATHS.root,
  ADMIN_PATHS.login,
  ADMIN_PATHS.forgotPassword,
  ADMIN_PATHS.changePassword,
];

/**
 * The address to go back to after signing in, or `undefined` when `raw` is not one. Only a path
 * inside the panel is accepted: anything that leads to another site (`//host`, `/\host`, a full
 * URL) or to an auth screen is dropped, so the parameter cannot be used to redirect elsewhere.
 */
export function safeNextPath(raw: string | undefined): string | undefined {
  if (!raw?.startsWith("/")) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return undefined;
  }
  // `/admin/login/` is the login screen too, so the closing slash does not count.
  const pathname = url.pathname.replace(/\/+$/, "");
  const insidePanel = url.origin === BASE && isWithin(pathname, ADMIN_PATHS.root);
  const isAuthScreen = AUTH_SCREENS.includes(pathname);
  return insidePanel && !isAuthScreen ? `${pathname}${url.search}` : undefined;
}

/**
 * Where a person goes after signing in. A temporary password comes first, whatever the address
 * they were heading to; then that address when their role may open it; then the products.
 */
export function destinationAfterLogin(user: AuthenticatedUser, next?: string): string {
  if (user.mustChangePassword) {
    return ADMIN_PATHS.changePassword;
  }
  const safe = safeNextPath(next);
  if (safe && canOpenPanelPath(user.role, new URL(safe, BASE).pathname)) {
    return safe;
  }
  return ADMIN_PATHS.products;
}
