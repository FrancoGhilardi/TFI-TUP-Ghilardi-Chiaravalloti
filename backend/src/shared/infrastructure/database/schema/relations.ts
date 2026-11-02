import { relations } from "drizzle-orm";
import { categories } from "./categories.js";
import { productCategories } from "./product-categories.js";
import { productImages } from "./product-images.js";
import { products } from "./products.js";
import { relatedProducts } from "./related-products.js";
import { sessions } from "./sessions.js";
import { users } from "./users.js";

export const usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  createdProducts: many(products, { relationName: "productCreatedBy" }),
  updatedProducts: many(products, { relationName: "productUpdatedBy" }),
  creator: one(users, {
    fields: [users.createdBy],
    references: [users.id],
    relationName: "userCreatedBy",
  }),
  updater: one(users, {
    fields: [users.updatedBy],
    references: [users.id],
    relationName: "userUpdatedBy",
  }),
  deleter: one(users, {
    fields: [users.deletedBy],
    references: [users.id],
    relationName: "userDeletedBy",
  }),
  createdUsers: many(users, { relationName: "userCreatedBy" }),
  updatedUsers: many(users, { relationName: "userUpdatedBy" }),
  deletedUsers: many(users, { relationName: "userDeletedBy" }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryParent",
  }),
  children: many(categories, { relationName: "categoryParent" }),
  productCategories: many(productCategories),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  productCategories: many(productCategories),
  images: many(productImages),
  relatedProducts: many(relatedProducts, { relationName: "relatedSource" }),
  relatedBy: many(relatedProducts, { relationName: "relatedTarget" }),
  creator: one(users, {
    fields: [products.createdBy],
    references: [users.id],
    relationName: "productCreatedBy",
  }),
  updater: one(users, {
    fields: [products.updatedBy],
    references: [users.id],
    relationName: "productUpdatedBy",
  }),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, { fields: [productCategories.productId], references: [products.id] }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const relatedProductsRelations = relations(relatedProducts, ({ one }) => ({
  product: one(products, {
    fields: [relatedProducts.productId],
    references: [products.id],
    relationName: "relatedSource",
  }),
  relatedProduct: one(products, {
    fields: [relatedProducts.relatedProductId],
    references: [products.id],
    relationName: "relatedTarget",
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));
