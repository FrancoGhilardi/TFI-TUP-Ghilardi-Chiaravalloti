import { sql } from "drizzle-orm";
import { check, index, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { libreria } from "./libreria.schema.js";
import { users } from "./users.js";

export const sessions = libreria.table(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refreshTokenHash: varchar("refresh_token_hash", { length: 255 }).notNull(),
    // Shared by a session and every session that replaced it through a refresh; a login
    // starts a new family with the id of its first session.
    familyId: uuid("family_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    // Set only when a refresh replaced the session; a revocation without it came from a
    // logout or a change to the user, so using the token again is not a reuse.
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
    userAgent: varchar("user_agent", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_sessions_refresh_token_hash").on(t.refreshTokenHash),
    check("chk_sessions_expires_after_created", sql`expires_at > created_at`),
    check("chk_sessions_rotated_is_revoked", sql`rotated_at IS NULL OR revoked_at IS NOT NULL`),
    index("idx_sessions_user_active")
      .on(sql`user_id`)
      .where(sql`revoked_at IS NULL`),
    index("idx_sessions_family_active")
      .on(sql`family_id`)
      .where(sql`revoked_at IS NULL`),
  ],
);
