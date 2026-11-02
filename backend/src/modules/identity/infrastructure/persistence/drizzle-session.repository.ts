import { Injectable } from "@nestjs/common";
import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { DrizzleExecutor } from "../../../../shared/infrastructure/database/drizzle.executor.js";
import { sessions } from "../../../../shared/infrastructure/database/schema/index.js";
import type { Session } from "../../domain/entities/session.js";
import { SessionRepository } from "../../domain/repositories/session.repository.js";
import { SessionMapper } from "./session.mapper.js";

@Injectable()
export class DrizzleSessionRepository extends SessionRepository {
  constructor(private readonly executor: DrizzleExecutor) {
    super();
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const [row] = await this.byTokenHash(tokenHash);
    return row ? SessionMapper.toDomain(row) : null;
  }

  async findByTokenHashForUpdate(tokenHash: string): Promise<Session | null> {
    // Outside a transaction the lock would be released at once, which is never what the
    // caller meant.
    if (!this.executor.hasActiveTransaction()) {
      throw new Error("findByTokenHashForUpdate must run inside a transaction");
    }
    const [row] = await this.byTokenHash(tokenHash).for("update");
    return row ? SessionMapper.toDomain(row) : null;
  }

  async save(session: Session): Promise<void> {
    const row = SessionMapper.toPersistence(session);
    // Only the revocation and rotation can change once a session exists, and they are never
    // undone: a stale copy read before a trigger or revokeAllForUser revoked the session must
    // not revive it.
    await this.executor
      .current()
      .insert(sessions)
      .values(row)
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          revokedAt: sql`coalesce(${sessions.revokedAt}, excluded.revoked_at)`,
          rotatedAt: sql`coalesce(${sessions.rotatedAt}, excluded.rotated_at)`,
        },
      });
  }

  private byTokenHash(tokenHash: string) {
    return this.executor
      .current()
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, tokenHash))
      .limit(1);
  }

  async revokeFamily(familyId: string, now: Date): Promise<void> {
    await this.executor
      .current()
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.familyId, familyId), isNull(sessions.revokedAt)));
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.executor
      .current()
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  /**
   * Skips the rows another statement has locked, such as a refresh or a revocation of every
   * session of a user, instead of waiting for them: those lock rows in another order, so waiting
   * could end in a deadlock. What is skipped is deleted on the next run.
   */
  async deleteExpired(now: Date): Promise<number> {
    const db = this.executor.current();
    const expired = db
      .select({ id: sessions.id })
      .from(sessions)
      .where(lte(sessions.expiresAt, now))
      .for("update", { skipLocked: true });
    const result = await db.delete(sessions).where(inArray(sessions.id, expired));
    return result.rowCount ?? 0;
  }
}
