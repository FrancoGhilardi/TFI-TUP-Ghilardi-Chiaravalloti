import { SetMetadata } from "@nestjs/common";
import { UserRole } from "../../domain/user-role.js";

export const ROLES_KEY = "roles";

/**
 * Roles allowed to call a handler or a whole controller; a handler overrides its
 * controller. Protected endpoints without it are denied to everyone.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Any panel user, admin or seller; other modules use it without knowing the roles. */
export const AnyPanelRole = () => Roles(UserRole.ADMIN, UserRole.SELLER);
