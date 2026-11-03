import type { Metadata } from "next";

import { pageMetadata } from "@/modules/core/seo/page-metadata";
import { summarize } from "@/modules/core/seo/summarize";

import { catalogSeo } from "../content/seo";
import type { ProductDetail } from "./product-detail";
import { productHref } from "./product-routes";

/** The metadata of a product page: its description and its first image for link previews. */
export function productMetadata(product: ProductDetail): Metadata {
  const [image] = product.images;
  return pageMetadata({
    title: product.title,
    description: product.description?.trim()
      ? summarize(product.description)
      : catalogSeo.productDescription(product.title, product.category?.name),
    path: productHref(product.slug),
    image: { url: image.url, alt: image.alt },
  });
}

/** What a product that is not in the store gets: its page is a 404 and must not be indexed. */
export const PRODUCT_NOT_FOUND_METADATA: Metadata = {
  title: catalogSeo.productNotFound,
  robots: { index: false },
};
