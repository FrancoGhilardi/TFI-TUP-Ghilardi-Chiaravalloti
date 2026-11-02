import type { UserRole } from "../../domain/user-role.js";

/** Only the fields present change; the rest stay as they are. */
export interface UpdateUserCommand {
  /** The admin making the change. */
  actorId: string;
  userId: string;
  email?: string;
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}
