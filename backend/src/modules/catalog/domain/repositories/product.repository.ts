import type { Slug } from "../../../../shared/domain/value-objects/slug.js";
import type { Product } from "../entities/product.js";

/** Loads and stores products, with their categories and related products. */
export abstract class ProductRepository {
  /** The product with that id, deleted or not, or `null`. */
  abstract findById(id: string): Promise<Product | null>;

  abstract existsBySlug(slug: Slug): Promise<boolean>;

  /**
   * The ids among `ids` that belong to current products. Inside a transaction they cannot be
   * deleted until it ends.
   */
  abstract findExistingIds(ids: string[]): Promise<string[]>;

  abstract save(product: Product): Promise<void>;
}
