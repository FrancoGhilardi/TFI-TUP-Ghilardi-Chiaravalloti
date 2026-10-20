import { Injectable } from "@nestjs/common";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
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
    const [row] = await this.executor
      .current()
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, tokenHash))
      .limit(1);
    return row ? SessionMapper.toDomain(row) : null;
  }

  async save(session: Session): Promise<void> {
    const row = SessionMapper.toPersistence(session);
    // Only the revocation can change once a session exists, and it is never undone: a stale
    // copy read before a trigger or revokeAllForUser revoked the session must not revive it.
    await this.executor
      .current()
      .insert(sessions)
      .values(row)
      .onConflictDoUpdate({
        target: sessions.id,
        set: { revokedAt: sql`coalesce(${sessions.revokedAt}, excluded.revoked_at)` },
      });
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.executor
      .current()
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  async deleteExpiredBefore(date: Date): Promise<number> {
    const deleted = await this.executor
      .current()
      .delete(sessions)
      .where(lt(sessions.expiresAt, date))
      .returning({ id: sessions.id });
    return deleted.length;
  }
}
