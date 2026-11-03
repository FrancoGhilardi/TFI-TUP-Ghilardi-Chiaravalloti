import type { Metadata } from "next";

import { pageMetadata } from "@/modules/core/seo/page-metadata";
import { summarize } from "@/modules/core/seo/summarize";

import { catalogSeo } from "../content/seo";
import {
  categoryHref,
  EMPTY_CATALOG_QUERY,
  parseCatalogQuery,
  type RawSearchParams,
} from "./catalog-query";
import { type CategoryNode, findCategory } from "./category";
import { CATALOG_PATH } from "./product-routes";

/**
 * The metadata of the catalog for the address asked. The catalog and each of its categories are
 * pages worth finding; a search, another order, a flag or a later page repeats them, so those
 * point to the page they belong to and ask not to be indexed.
 */
export function catalogMetadata(raw: RawSearchParams, tree: CategoryNode[]): Metadata {
  const query = parseCatalogQuery(raw);
  const category = query.category ? findCategory(tree, query.category) : undefined;
  const isFiltered =
    query.q !== undefined ||
    query.featured ||
    query.newArrivals ||
    query.sort !== EMPTY_CATALOG_QUERY.sort ||
    query.page > EMPTY_CATALOG_QUERY.page;
  // An empty tree is a failed read, not a store without categories: the slug cannot be judged.
  const isUnknownCategory =
    query.category !== undefined && category === undefined && tree.length > 0;
  const path =
    category || (query.category && tree.length === 0)
      ? categoryHref(category?.slug ?? query.category ?? "")
      : CATALOG_PATH;

  return pageMetadata({
    title: category?.name ?? catalogSeo.title,
    description: category
      ? summarize(category.description ?? catalogSeo.categoryDescription(category.name))
      : catalogSeo.description,
    path,
    noIndex: isFiltered || isUnknownCategory,
  });
}
