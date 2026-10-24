import type { AuthenticatedUserResult } from "../../application/dto/authenticated-user.result.js";
import type { UserRole } from "../../domain/user-role.js";

/**
 * The authenticated user as every auth response shows it: the login, refresh and password
 * change bodies and `GET /auth/me`, so the frontend always gets the same shape.
 */
export class AuthenticatedUserResponseDto {
  private constructor(
    readonly id: string,
    readonly email: string,
    readonly name: string,
    readonly role: UserRole,
    readonly mustChangePassword: boolean,
  ) {}

  // Copies field by field, so nothing else the user carries is ever sent.
  static from(user: AuthenticatedUserResult): AuthenticatedUserResponseDto {
    return new AuthenticatedUserResponseDto(
      user.id,
      user.email,
      user.name,
      user.role,
      user.mustChangePassword,
    );
  }
}
