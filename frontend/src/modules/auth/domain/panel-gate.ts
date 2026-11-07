import { ADMIN_PATHS } from "./routes";
import type { SessionStatus } from "./session-status";
import type { AuthenticatedUser } from "./user";

interface PanelGateInput {
  status: SessionStatus;
  user: AuthenticatedUser | null;
  /** Path of the panel screen being opened. */
  pathname: string;
  /** Its query, without the leading `?`. */
  search?: string;
}

/**
 * Where a person has to go before the panel screen they opened may show, or `null` when it may
 * show now (or when the session is still being restored and there is nothing to decide yet). A
 * person who closed the session goes to a plain sign-in; one whose session ended comes back to
 * where they were.
 * Only the experience is decided here: the API refuses what the person may not do.
 */
export function panelGateDestination({
  status,
  user,
  pathname,
  search = "",
}: PanelGateInput): string | null {
  if (status === "signedOut") {
    return ADMIN_PATHS.login;
  }
  if (status === "anonymous") {
    const address = search ? `${pathname}?${search}` : pathname;
    return `${ADMIN_PATHS.login}?next=${encodeURIComponent(address)}`;
  }
  if (status === "authenticated" && user?.mustChangePassword) {
    return pathname === ADMIN_PATHS.changePassword ? null : ADMIN_PATHS.changePassword;
  }
  return null;
}
