import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InvalidAccessTokenError } from "../../application/errors/invalid-access-token-error.js";
import { AccessTokenService } from "../../application/ports/access-token-service.js";
import { ResolveAuthenticatedUserUseCase } from "../../application/use-cases/resolve-authenticated-user.use-case.js";
import type { AuthUser } from "../auth-user.js";
import { isPublic } from "../decorators/public.decorator.js";

type AuthenticatedRequest = { headers: Record<string, string | string[] | undefined> } & {
  user?: AuthUser;
};

// The scheme is case insensitive (RFC 9110); the token must not be empty.
const BEARER_PATTERN = /^Bearer +(\S+)$/i;

/**
 * Requires a valid access token on every endpoint not marked with `@Public()`, and sets the
 * current user, read from the database, on the request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokenService,
    private readonly resolveUser: ResolveAuthenticatedUserUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (isPublic(this.reflector, context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { userId, issuedAt } = this.accessTokens.verify(this.bearerToken(request));
    request.user = await this.resolveUser.execute({ userId, tokenIssuedAt: issuedAt });
    return true;
  }

  private bearerToken(request: AuthenticatedRequest): string {
    const { authorization } = request.headers;
    const match = typeof authorization === "string" ? BEARER_PATTERN.exec(authorization) : null;
    if (!match) {
      throw new InvalidAccessTokenError();
    }
    return match[1];
  }
}
