export type UserRole = "ADMIN" | "SELLER";

/** The person signed in to the panel, as the API describes them. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** A temporary password is still in use: it must be replaced before anything else. */
  mustChangePassword: boolean;
}
