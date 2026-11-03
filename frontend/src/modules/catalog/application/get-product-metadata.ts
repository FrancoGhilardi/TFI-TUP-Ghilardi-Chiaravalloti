import type { Metadata } from "next";

import { PRODUCT_NOT_FOUND_METADATA, productMetadata } from "../domain/product-metadata";
import { getProductPage } from "./get-product-page";

/** The metadata of a product page, from the same read the page makes. */
export async function getProductMetadata(slug: string): Promise<Metadata> {
  const result = await getProductPage(slug);
  return result.status === "ok" ? productMetadata(result.product) : PRODUCT_NOT_FOUND_METADATA;
}
