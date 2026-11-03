import type { Metadata } from "next";

import { catalogMetadata } from "../domain/catalog-metadata";
import type { RawSearchParams } from "../domain/catalog-query";
import { getStoreCategoryTree } from "./store-categories";

/** The metadata of the catalog; without the category tree it still describes the whole catalog. */
export async function getCatalogMetadata(searchParams: RawSearchParams): Promise<Metadata> {
  return catalogMetadata(searchParams, await getStoreCategoryTree());
}
