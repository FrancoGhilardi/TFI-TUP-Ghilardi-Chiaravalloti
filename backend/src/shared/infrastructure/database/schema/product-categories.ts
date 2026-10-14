import { sql } from "drizzle-orm";
import { boolean, index, primaryKey, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { categories } from "./categories.js";
import { libreria } from "./libreria.schema.js";
import { products } from "./products.js";

export const productCategories = libreria.table(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [
    primaryKey({ name: "pk_product_categories", columns: [t.productId, t.categoryId] }),
    uniqueIndex("uq_product_categories_primary")
      .on(t.productId)
      .where(sql`is_primary`),
    index("idx_product_categories_category_id").on(t.categoryId),
  ],
);
