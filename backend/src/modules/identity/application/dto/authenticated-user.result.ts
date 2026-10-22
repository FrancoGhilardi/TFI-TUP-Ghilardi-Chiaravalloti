import type { User } from "../../domain/entities/user.js";
import type { UserRole } from "../../domain/user-role.js";

export interface AuthenticatedUserResult {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export function toAuthenticatedUserResult(user: User): AuthenticatedUserResult {
  return {
    id: user.getId(),
    email: user.email.toString(),
    name: user.name.toString(),
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}
