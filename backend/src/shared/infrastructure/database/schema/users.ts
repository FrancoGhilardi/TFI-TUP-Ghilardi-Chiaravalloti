import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { userRole } from "./enums.js";
import { libreria } from "./libreria.schema.js";
import { citext } from "./types.js";

export const users = libreria.table(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: citext("email").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: userRole("role").notNull().default("SELLER"),
    isActive: boolean("is_active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    temporaryPasswordHash: varchar("temporary_password_hash", { length: 255 }),
    temporaryPasswordExpiresAt: timestamp("temporary_password_expires_at", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdBy: uuid("created_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
    deletedBy: uuid("deleted_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  () => [
    check("chk_users_email_format", sql`email ~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'`),
    check("chk_users_name_not_blank", sql`btrim(name) <> ''`),
    check(
      "chk_users_deleted_by_requires_deleted_at",
      sql`deleted_by IS NULL OR deleted_at IS NOT NULL`,
    ),
    check(
      "chk_users_temporary_password_pair",
      sql`(temporary_password_hash IS NULL) = (temporary_password_expires_at IS NULL)`,
    ),
    uniqueIndex("uq_users_email_not_deleted")
      .on(sql`email`)
      .where(sql`deleted_at IS NULL`),
    index("idx_users_role_active")
      .on(sql`role`)
      .where(sql`is_active AND deleted_at IS NULL`),
  ],
);
