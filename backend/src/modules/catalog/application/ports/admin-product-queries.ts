import type { AdminProductDetailResult } from "../dto/admin-product-detail.result.js";

/** Reads products for the admin panel, without loading entities. */
export abstract class AdminProductQueries {
  /** The product with that id, deleted or not, or `null`. */
  abstract findById(id: string): Promise<AdminProductDetailResult | null>;
}
