import type { UserRole } from "./user";

/** The signed-in person's own data. The dates are there only when the API sends them. */
export interface AccountProfile {
  name: string;
  email: string;
  role: UserRole;
  lastLoginAt?: Date;
  createdAt?: Date;
}
