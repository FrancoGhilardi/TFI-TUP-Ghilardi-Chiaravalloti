import { applyDecorators, SetMetadata } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import {
  ACCESS_TOKEN_AUTH,
  ApiErrors,
} from "../../../../shared/presentation/http/openapi-decorators.js";
import { UserRole } from "../../domain/user-role.js";

export const ROLES_KEY = "roles";

/**
 * Roles allowed to call a handler or a whole controller; a handler overrides its
 * controller. Protected endpoints without it are denied to everyone. It also documents that
 * the endpoint needs the access token, and the 401 without a valid one.
 */
export const Roles = (...roles: UserRole[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    ApiBearerAuth(ACCESS_TOKEN_AUTH),
    ApiErrors({ 401: ["INVALID_ACCESS_TOKEN"] }),
  );

/** Any panel user, admin or seller; other modules use it without knowing the roles. */
export const AnyPanelRole = () => Roles(UserRole.ADMIN, UserRole.SELLER);
