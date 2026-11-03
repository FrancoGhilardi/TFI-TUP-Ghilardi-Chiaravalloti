import { ApiError } from "@/modules/core/http";

import type { ProductDetail } from "../domain/product-detail";
import { getProductDetail } from "../infrastructure/product-detail-api";

export type ProductPageResult = { status: "ok"; product: ProductDetail } | { status: "not-found" };

/**
 * The product for its page. The API answers 404 for a slug that is unknown or not visible, which
 * is a page of its own; any other failure is thrown for the route's error page.
 */
export async function getProductPage(slug: string): Promise<ProductPageResult> {
  try {
    return { status: "ok", product: await getProductDetail(slug) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { status: "not-found" };
    }
    throw error;
  }
}
