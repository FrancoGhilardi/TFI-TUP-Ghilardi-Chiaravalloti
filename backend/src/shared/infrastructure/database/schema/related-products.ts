import { sql } from "drizzle-orm";
import { check, index, primaryKey, smallint, uuid } from "drizzle-orm/pg-core";
import { libreria } from "./libreria.schema.js";
import { products } from "./products.js";

export const relatedProducts = libreria.table(
  "related_products",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    relatedProductId: uuid("related_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [
    primaryKey({ name: "pk_related_products", columns: [t.productId, t.relatedProductId] }),
    check("chk_related_products_not_self", sql`product_id <> related_product_id`),
    index("idx_related_products_related_product_id").on(t.relatedProductId),
  ],
);
