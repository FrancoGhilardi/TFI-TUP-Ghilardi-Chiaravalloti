import type { UserRole } from "@/modules/auth";

/** A user as the panel's list and form read it (`UserResponseDto` of the API). */
export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  /** A temporary password is still in use: it must be replaced on the next sign-in. */
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
