import type { UserRole } from "../../domain/user-role.js";

/**
 * A user as the admin panel shows it. Dates the user does not have are `null`, so the shape
 * never changes; hashes and temporary passwords never leave the backend.
 */
export interface UserResult {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
