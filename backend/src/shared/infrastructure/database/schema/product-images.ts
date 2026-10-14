import { sql } from "drizzle-orm";
import { check, integer, smallint, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { imageStatus } from "./enums.js";
import { libreria } from "./libreria.schema.js";
import { products } from "./products.js";

// uq_product_images_position (product_id, position) is DEFERRABLE, so it is created in a manual
// migration.
export const productImages = libreria.table(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    originalKey: varchar("original_key", { length: 500 }).notNull(),
    publicKey: varchar("public_key", { length: 500 }),
    altText: varchar("alt_text", { length: 255 }),
    mimeType: varchar("mime_type", { length: 50 }).notNull(),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes"),
    status: imageStatus("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_product_images_original_key").on(t.originalKey),
    unique("uq_product_images_public_key").on(t.publicKey),
    check("chk_product_images_position_range", sql`position BETWEEN 1 AND 5`),
    check(
      "chk_product_images_mime_type",
      sql`mime_type IN ('image/jpeg', 'image/png', 'image/webp')`,
    ),
    check(
      "chk_product_images_dimensions",
      sql`(width IS NULL OR width > 0) AND (height IS NULL OR height > 0)`,
    ),
    check("chk_product_images_size", sql`size_bytes IS NULL OR size_bytes > 0`),
    check(
      "chk_product_images_processed_has_public_key",
      sql`status <> 'PROCESSED' OR public_key IS NOT NULL`,
    ),
  ],
);
