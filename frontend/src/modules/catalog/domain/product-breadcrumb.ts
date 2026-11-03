import type { BreadcrumbItem } from "@/modules/core/lib/breadcrumb";

import { productDetailContent } from "../content/product-detail";
import { categoryHref } from "./catalog-query";
import type { ProductDetail } from "./product-detail";
import { CATALOG_PATH } from "./product-routes";

/** Inicio › category (or the catalog when it is hidden) › the product. */
export function productBreadcrumb({ title, category }: ProductDetail): BreadcrumbItem[] {
  const { home, products } = productDetailContent.breadcrumb;
  return [
    { label: home, href: "/" },
    category
      ? { label: category.name, href: categoryHref(category.slug) }
      : { label: products, href: CATALOG_PATH },
    { label: title },
  ];
}
