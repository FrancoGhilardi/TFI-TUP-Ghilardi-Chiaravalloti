import type { sessions } from "../../../../shared/infrastructure/database/schema/index.js";
import { Session } from "../../domain/entities/session.js";

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;

/** Translates between the `sessions` table and the `Session` entity. */
export const SessionMapper = {
  toDomain(row: SessionRow): Session {
    return Session.reconstitute({
      id: row.id,
      userId: row.userId,
      refreshTokenHash: row.refreshTokenHash,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt ?? undefined,
      rotatedAt: row.rotatedAt ?? undefined,
      userAgent: row.userAgent ?? undefined,
      createdAt: row.createdAt,
    });
  },

  toPersistence(session: Session): NewSessionRow {
    return {
      id: session.getId(),
      userId: session.userId,
      refreshTokenHash: session.refreshTokenHash,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt ?? null,
      rotatedAt: session.rotatedAt ?? null,
      userAgent: session.userAgent ?? null,
      createdAt: session.createdAt,
    };
  },
};
