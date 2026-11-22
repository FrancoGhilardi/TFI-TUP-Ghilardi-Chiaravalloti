import type { Metadata } from "next";

import {
  PRODUCT_ERROR_METADATA,
  PRODUCT_NOT_FOUND_METADATA,
  productMetadata,
} from "../domain/product-metadata";
import { getProductPage } from "./get-product-page";

/**
 * The metadata of a product page, from the same read the page makes. A failed read is not thrown
 * here: the page throws it for its error page, which would otherwise lose every tag, title included.
 */
export async function getProductMetadata(slug: string): Promise<Metadata> {
  try {
    const result = await getProductPage(slug);
    return result.status === "ok" ? productMetadata(result.product) : PRODUCT_NOT_FOUND_METADATA;
  } catch {
    return PRODUCT_ERROR_METADATA;
  }
}
