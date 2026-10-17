import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "../../domain/user-role.js";

export const ROLES_KEY = "roles";

/**
 * Roles allowed to call a handler or a whole controller; a handler overrides its
 * controller. Protected endpoints without it are denied to everyone.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
