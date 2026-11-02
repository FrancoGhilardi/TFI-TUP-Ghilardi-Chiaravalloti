import type { AuthenticatedUserResult } from "../application/dto/authenticated-user.result.js";

/** The authenticated user attached to the request by `JwtAuthGuard`. */
export type AuthUser = AuthenticatedUserResult;
