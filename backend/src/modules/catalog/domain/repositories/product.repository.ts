import type { Slug } from "../../../../shared/domain/value-objects/slug.js";
import type { Product } from "../entities/product.js";

/** Loads and stores products, with their categories and related products. */
export abstract class ProductRepository {
  /** The product with that id, deleted or not, or `null`. */
  abstract findById(id: string): Promise<Product | null>;

  abstract existsBySlug(slug: Slug): Promise<boolean>;

  /**
   * Makes another transaction that locks the same slug wait until this one ends, so two
   * creations never pick the same slug. Only inside a transaction.
   */
  abstract lockSlug(slug: Slug): Promise<void>;

  /**
   * The ids among `ids` that belong to current products. Inside a transaction they cannot be
   * deleted until it ends.
   */
  abstract findExistingIds(ids: string[]): Promise<string[]>;

  abstract save(product: Product): Promise<void>;
}
