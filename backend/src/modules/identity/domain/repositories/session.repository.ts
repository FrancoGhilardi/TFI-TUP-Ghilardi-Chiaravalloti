import type { Session } from "../entities/session.js";

/** Loads and stores the sessions started with a refresh token. */
export abstract class SessionRepository {
  /** Returns the session whose refresh token has that hash, revoked or not, or `null`. */
  abstract findByTokenHash(tokenHash: string): Promise<Session | null>;

  /**
   * Same as `findByTokenHash`, but the session stays locked until the transaction ends, so a
   * concurrent change waits. Only valid inside a transaction.
   */
  abstract findByTokenHashForUpdate(tokenHash: string): Promise<Session | null>;

  /** Stores a new session or the changes of an existing one. */
  abstract save(session: Session): Promise<void>;

  /** Revokes every session of the user that is not revoked yet. */
  abstract revokeAllForUser(userId: string, now: Date): Promise<void>;

  /** Deletes the sessions that expired before `date`; returns how many were deleted. */
  abstract deleteExpiredBefore(date: Date): Promise<number>;
}
