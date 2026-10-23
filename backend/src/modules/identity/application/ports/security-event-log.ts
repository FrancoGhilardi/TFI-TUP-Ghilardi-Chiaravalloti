/**
 * Records security events worth investigating. It only receives ids, never tokens or their
 * hashes, so nothing written to it can be used to take over a session.
 */
export abstract class SecurityEventLog {
  /** A revoked refresh token was used again, so every session of the user was revoked. */
  abstract refreshTokenReused(userId: string): void;
}
