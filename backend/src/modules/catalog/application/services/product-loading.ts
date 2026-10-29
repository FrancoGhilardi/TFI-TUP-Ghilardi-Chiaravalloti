import type { Product } from "../../domain/entities/product.js";
import { ProductDeletedError } from "../../domain/errors/product-deleted-error.js";
import { CategoryUnavailableError } from "../../domain/errors/category-unavailable-error.js";
import { RelatedProductUnavailableError } from "../../domain/errors/related-product-unavailable-error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { ProductRepository } from "../../domain/repositories/product.repository.js";
import type { AdminProductDetailResult } from "../dto/admin-product-detail.result.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import type { AdminProductQueries } from "../ports/admin-product-queries.js";

/** The product, deleted or not; an unknown one is a 404. Inside a transaction it is locked. */
export async function loadProduct(products: ProductRepository, id: string): Promise<Product> {
  const product = await products.findById(id);
  if (!product) {
    throw new ProductNotFoundError();
  }
  return product;
}

/** A product that can still be changed: not deleted. Inside a transaction it is locked. */
export async function loadEditableProduct(
  products: ProductRepository,
  id: string,
): Promise<Product> {
  const product = await loadProduct(products, id);
  if (product.isDeleted()) {
    throw new ProductDeletedError();
  }
  return product;
}

/**
 * Every category among `ids` is active and current. Inside a transaction they stay
 * share-locked, so a deletion waits and then counts the product.
 */
export async function assertCategoriesVisible(
  categories: CategoryRepository,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const visible = await categories.findVisibleByIds(ids);
  if (visible.length !== ids.length) {
    throw new CategoryUnavailableError();
  }
}

/**
 * At least one category among `ids` is current, active or not; the current ones stay
 * share-locked like the visible ones.
 */
export async function assertSomeCategoryCurrent(
  categories: CategoryRepository,
  ids: string[],
): Promise<void> {
  if ((await categories.findCurrentIds(ids)).length === 0) {
    throw new CategoryUnavailableError();
  }
}

/** Every product among `ids`, given once each, is current; share-locked inside a transaction. */
export async function assertRelatedExist(
  products: ProductRepository,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const existing = await products.findExistingIds(ids);
  if (existing.length !== ids.length) {
    throw new RelatedProductUnavailableError();
  }
}

/** The product as the panel shows it; an unknown one is a 404. */
export async function detailOf(
  queries: AdminProductQueries,
  id: string,
): Promise<AdminProductDetailResult> {
  const result = await queries.findById(id);
  if (!result) {
    throw new ProductNotFoundError();
  }
  return result;
}
