import { Entity } from "../../../../shared/domain/entity.js";

export interface SessionProps {
  id: string;
  userId: string;
  /** Only the hash of the refresh token is ever stored. */
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
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

  get userAgent(): string | undefined {
    return this.props.userAgent;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== undefined;
  }

  isActive(now: Date): boolean {
    return !this.isRevoked() && now.getTime() < this.props.expiresAt.getTime();
  }

  /** Revoking twice keeps the first revocation time. */
  revoke(now: Date): void {
    if (this.isRevoked()) {
      return;
    }
    this.props.revokedAt = now;
  }
}
