import type { Page } from "../../../../shared/application/pagination.js";
import type {
  AdminProductDetailResult,
  AdminProductImageResult,
} from "../dto/admin-product-detail.result.js";
import type { AdminProductListItemResult } from "../dto/admin-product-list-item.result.js";
import type { ListAdminProductsQuery } from "../dto/list-admin-products.query.js";

/** Reads products for the admin panel, without loading entities. */
export abstract class AdminProductQueries {
  /** A page of the product list; `now` tells which sales and "new" marks still run. */
  abstract findPage(
    query: ListAdminProductsQuery,
    now: Date,
  ): Promise<Page<AdminProductListItemResult>>;

  /** The product with that id, deleted or not, or `null`. */
  abstract findById(id: string): Promise<AdminProductDetailResult | null>;

  /** The image with that id, as the product detail shows it, or `null`. */
  abstract findImageById(id: string): Promise<AdminProductImageResult | null>;

  /**
   * The product's images as its detail shows them, by position, deleted product or not; `null`
   * when there is no such product.
   */
  abstract findImagesByProduct(productId: string): Promise<AdminProductImageResult[] | null>;
}
