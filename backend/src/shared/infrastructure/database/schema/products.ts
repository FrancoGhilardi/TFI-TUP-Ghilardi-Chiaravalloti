import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { libreria } from "./libreria.schema.js";
import { users } from "./users.js";

export const products = libreria.table(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The database default is set in a manual migration because the function does not exist yet
    // when the generated migration runs.
    sku: varchar("sku", { length: 64 })
      .notNull()
      .$defaultFn(() => sql`libreria.next_product_sku()`),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    description: text("description"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    salePrice: numeric("sale_price", { precision: 12, scale: 2 }),
    isOnSale: boolean("is_on_sale").notNull().default(false),
    saleEndsAt: timestamp("sale_ends_at", { withTimezone: true }),
    stock: integer("stock").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    newUntil: timestamp("new_until", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    unique("uq_products_sku").on(t.sku),
    check("chk_products_sku_format", sql`sku ~ '^LMS-[0-9]{6,}$'`),
    unique("uq_products_slug").on(t.slug),
    check("chk_products_slug_format", sql`slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("chk_products_title_not_blank", sql`btrim(title) <> ''`),
    check("chk_products_price_positive", sql`price > 0`),
    check(
      "chk_products_sale_price_range",
      sql`sale_price IS NULL OR (sale_price > 0 AND sale_price < price)`,
    ),
    check(
      "chk_products_on_sale_requires_sale_price",
      sql`NOT is_on_sale OR sale_price IS NOT NULL`,
    ),
    check("chk_products_stock_non_negative", sql`stock >= 0`),
    index("idx_products_visible")
      .on(sql`sort_order`, sql`created_at DESC`)
      .where(sql`is_active AND deleted_at IS NULL`),
    index("idx_products_featured")
      .on(sql`sort_order`, sql`created_at DESC`)
      .where(sql`is_featured AND is_active AND deleted_at IS NULL`),
    index("idx_products_new")
      .on(sql`sort_order`, sql`created_at DESC`)
      .where(sql`is_new AND is_active AND deleted_at IS NULL`),
    index("idx_products_on_sale")
      .on(sql`sort_order`)
      .where(sql`is_on_sale AND is_active AND deleted_at IS NULL`),
    index("idx_products_created_by").on(t.createdBy),
    index("idx_products_updated_by").on(t.updatedBy),
  ],
);
