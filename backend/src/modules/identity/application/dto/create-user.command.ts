import type { UserRole } from "../../domain/user-role.js";

export interface CreateUserCommand {
  /** The admin creating the user. */
  actorId: string;
  email: string;
  name: string;
  role: UserRole;
  /** Set by the admin; the new user must replace it on the first login. */
  temporaryPassword: string;
}
