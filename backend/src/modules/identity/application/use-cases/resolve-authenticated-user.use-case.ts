import type { UseCase } from "../../../../shared/application/use-case.js";
import type { User } from "../../domain/entities/user.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import type { AuthenticatedUserResult } from "../dto/authenticated-user.result.js";
import type { ResolveAuthenticatedUserQuery } from "../dto/resolve-authenticated-user.query.js";
import { InvalidAccessTokenError } from "../errors/invalid-access-token-error.js";

const toSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

/**
 * Turns the subject of a verified access token into the current user. Role and status
 * always come from the database, so changes to the user apply on the next request.
 */
export class ResolveAuthenticatedUserUseCase implements UseCase<
  ResolveAuthenticatedUserQuery,
  AuthenticatedUserResult
> {
  constructor(private readonly users: UserRepository) {}

  async execute(query: ResolveAuthenticatedUserQuery): Promise<AuthenticatedUserResult> {
    const user = await this.users.findById(query.userId);
    if (!user || !user.canLogin() || this.issuedBeforePasswordChange(user, query.tokenIssuedAt)) {
      throw new InvalidAccessTokenError();
    }

    return {
      id: user.getId(),
      email: user.email.toString(),
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
  }

  // The token only carries whole seconds, so a token issued in the same second as the
  // change (the new session after changing the password) must stay valid.
  private issuedBeforePasswordChange(user: User, tokenIssuedAt: Date): boolean {
    return (
      user.passwordChangedAt !== undefined &&
      toSeconds(tokenIssuedAt) < toSeconds(user.passwordChangedAt)
    );
  }
}
