const MINUTE_MS = 60_000;

/** Hash and expiry of a temporary password issued by the forgot-password flow. */
export class TemporaryPassword {
  constructor(
    readonly hash: string,
    readonly expiresAt: Date,
  ) {}

  isExpired(now: Date): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }

  /**
   * Whether a new temporary password must wait, so the flow cannot be used to flood the
   * user's inbox. The issue time is derived from the expiry and the lifetime, so no extra
   * column is needed; it is only exact while the configured lifetime stays the one the
   * password was issued with.
   */
  isInCooldown(now: Date, ttlMinutes: number, cooldownMinutes: number): boolean {
    const issuedAt = this.expiresAt.getTime() - ttlMinutes * MINUTE_MS;
    return now.getTime() < issuedAt + cooldownMinutes * MINUTE_MS;
  }
}
