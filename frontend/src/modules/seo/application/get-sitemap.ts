import type { MetadataRoute } from "next";

import { CATALOG_PATH, getCatalogSitemapPaths } from "@/modules/catalog";
import { publicConfig } from "@/modules/core/config/env";
import { HOME_PATH } from "@/modules/home";
import { ABOUT_PATH } from "@/modules/institutional";

import { sitemapEntries } from "../domain/sitemap";

/** Every page of the store worth finding: the fixed ones, the categories and the active products. */
export async function getSitemap(): Promise<MetadataRoute.Sitemap> {
  const { categoryPaths, productPaths } = await getCatalogSitemapPaths();
  return sitemapEntries(publicConfig.siteOrigin, {
    home: HOME_PATH,
    pages: [CATALOG_PATH, ABOUT_PATH],
    categories: categoryPaths,
    products: productPaths,
  });
}
