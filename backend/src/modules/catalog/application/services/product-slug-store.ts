import {
  slugStoreOf,
  type SlugStore,
} from "../../../../shared/application/unique-slug-generator.js";
import { RESERVED_PRODUCT_SLUGS } from "../../domain/reserved-slugs.js";
import type { ProductRepository } from "../../domain/repositories/product.repository.js";

/** The slugs products can take: neither one already stored nor one a store route uses. */
export function productSlugStore(products: ProductRepository): SlugStore {
  const stored = slugStoreOf(products);
  return {
    ...stored,
    exists: async (slug) => RESERVED_PRODUCT_SLUGS.includes(slug.toString()) || stored.exists(slug),
  };
}
