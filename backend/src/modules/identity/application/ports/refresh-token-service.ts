/**
 * Creates the opaque refresh tokens kept in the session cookie. Only their hash is stored,
 * so a leaked database does not give away usable tokens.
 */
export abstract class RefreshTokenService {
  abstract generate(): string;
  abstract hash(token: string): string;
}
