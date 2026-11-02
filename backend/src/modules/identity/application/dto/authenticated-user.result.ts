import type { UserRole } from "../../domain/user-role.js";

export interface AuthenticatedUserResult {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mustChangePassword: boolean;
}
