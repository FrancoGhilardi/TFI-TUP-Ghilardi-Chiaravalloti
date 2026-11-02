import type { AuthenticatedUserResult } from "../../application/dto/authenticated-user.result.js";
import { UserRole } from "../../domain/user-role.js";

/**
 * The authenticated user as every auth response shows it: the login, refresh and password
 * change bodies and `GET /auth/me`, so the frontend always gets the same shape.
 */
export class AuthenticatedUserResponseDto {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  /** The user still has to replace a temporary password before using the rest of the panel. */
  readonly mustChangePassword: boolean;

  private constructor(user: AuthenticatedUserResult) {
    // Copies field by field, so nothing else the user carries is ever sent.
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.role = user.role;
    this.mustChangePassword = user.mustChangePassword;
  }

  static from(user: AuthenticatedUserResult): AuthenticatedUserResponseDto {
    return new AuthenticatedUserResponseDto(user);
  }
}
