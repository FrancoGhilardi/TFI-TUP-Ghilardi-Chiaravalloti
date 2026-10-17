/** Hash and expiry of a temporary password issued by the forgot-password flow. */
export class TemporaryPassword {
  constructor(
    readonly hash: string,
    readonly expiresAt: Date,
  ) {}

  isExpired(now: Date): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }
}
