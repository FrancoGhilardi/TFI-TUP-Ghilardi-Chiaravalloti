import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { libreria } from "./libreria.schema.js";

export const categories = libreria.table(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "restrict",
    }),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    unique("uq_categories_slug").on(t.slug),
    check("chk_categories_slug_format", sql`slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("chk_categories_not_own_parent", sql`parent_id IS NULL OR parent_id <> id`),
    uniqueIndex("uq_categories_name_not_deleted")
      .on(sql`lower(name)`)
      .where(sql`deleted_at IS NULL`),
    index("idx_categories_parent_id").on(t.parentId),
    index("idx_categories_visible")
      .on(t.sortOrder)
      .where(sql`is_active AND deleted_at IS NULL`),
  ],
);
