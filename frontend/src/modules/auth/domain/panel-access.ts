import { ADMIN_PATHS } from "./routes";
import type { UserRole } from "./user";

/** Sections only some roles may open. */
const ROLE_SECTIONS: { path: string; roles: UserRole[] }[] = [
  { path: ADMIN_PATHS.users, roles: ["ADMIN"] },
];

/** Whether `pathname` is the `section` itself or something below it. */
export const isWithin = (pathname: string, section: string): boolean =>
  pathname === section || pathname.startsWith(`${section}/`);

/**
 * Whether a role may open a panel screen. Only the experience is decided here (the menu, the
 * "no permission" screen, where to land after signing in): the API refuses what a role may not do.
 */
export function canOpenPanelPath(role: UserRole, pathname: string): boolean {
  return ROLE_SECTIONS.every(
    ({ path, roles }) => !isWithin(pathname, path) || roles.includes(role),
  );
}
