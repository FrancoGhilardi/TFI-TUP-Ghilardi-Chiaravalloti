import { Entity } from "../../../../shared/domain/entity.js";

export interface SessionProps {
  id: string;
  userId: string;
  /** Only the hash of the refresh token is ever stored. */
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  /** When a refresh replaced the session; always revoked by then. */
  rotatedAt?: Date;
  userAgent?: string;
  createdAt: Date;
}

export interface NewSessionProps {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  now: Date;
}

/** A session started with a refresh token; valid until it expires or is revoked. */
export class Session extends Entity {
  private constructor(private readonly props: SessionProps) {
    super(props.id);
  }

  static start(input: NewSessionProps): Session {
    // The expiry is computed by the caller from the settings; a session that is born expired
    // is a programming error, not something a user can cause.
    if (input.expiresAt.getTime() <= input.now.getTime()) {
      throw new Error("A session must expire after it starts");
    }
    return new Session({
      id: input.id,
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent,
      createdAt: input.now,
    });
  }

  static reconstitute(props: SessionProps): Session {
    return new Session({ ...props });
  }

  get userId(): string {
    return this.props.userId;
  }

  get refreshTokenHash(): string {
    return this.props.refreshTokenHash;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get revokedAt(): Date | undefined {
    return this.props.revokedAt;
  }

  get rotatedAt(): Date | undefined {
    return this.props.rotatedAt;
  }

  get userAgent(): string | undefined {
    return this.props.userAgent;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== undefined;
  }

  /** Whether a refresh already replaced it, so its token was spent, not just revoked. */
  isRotated(): boolean {
    return this.props.rotatedAt !== undefined;
  }

  isExpired(now: Date): boolean {
    return now.getTime() >= this.props.expiresAt.getTime();
  }

  isActive(now: Date): boolean {
    return !this.isRevoked() && !this.isExpired(now);
  }

  /** Revoking twice keeps the first revocation time. */
  revoke(now: Date): void {
    if (this.isRevoked()) {
      return;
    }
    this.props.revokedAt = now;
  }

  /**
   * Revokes the session because a refresh replaced it. Only an active session can be rotated:
   * a revoked one must be told apart from a spent one, and the caller checks that first.
   */
  rotate(now: Date): void {
    if (this.isRevoked()) {
      throw new Error("Only an unrevoked session can be rotated");
    }
    this.props.revokedAt = now;
    this.props.rotatedAt = now;
  }
}
