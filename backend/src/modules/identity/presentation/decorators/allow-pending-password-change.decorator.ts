import { SetMetadata } from "@nestjs/common";

export const ALLOW_PENDING_PASSWORD_CHANGE_KEY = "allowPendingPasswordChange";

/**
 * Lets a user who still has to replace a temporary password call a handler or a whole
 * controller; the rest of the API stays blocked until the change is done.
 */
export const AllowPendingPasswordChange = () =>
  SetMetadata(ALLOW_PENDING_PASSWORD_CHANGE_KEY, true);
