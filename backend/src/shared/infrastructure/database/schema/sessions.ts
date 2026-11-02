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
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: varchar("user_agent", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_sessions_refresh_token_hash").on(t.refreshTokenHash),
    check("chk_sessions_expires_after_created", sql`expires_at > created_at`),
    index("idx_sessions_user_active")
      .on(sql`user_id`)
      .where(sql`revoked_at IS NULL`),
  ],
);
