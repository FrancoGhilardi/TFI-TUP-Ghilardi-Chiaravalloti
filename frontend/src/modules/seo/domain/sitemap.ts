import type { MetadataRoute } from "next";

export interface SitemapPaths {
  home: string;
  /** Other fixed pages of the store. */
  pages: string[];
  categories: string[];
  products: string[];
}

type SitemapEntry = MetadataRoute.Sitemap[number];

// The pages people land on first weigh more; a product weighs less than its category.
const HOME_PRIORITY = 1;
const PAGE_PRIORITY = 0.8;
const CATEGORY_PRIORITY = 0.7;
const PRODUCT_PRIORITY = 0.6;

const weekly = (siteOrigin: string, paths: string[], priority: number): SitemapEntry[] =>
  paths.map((path) => ({
    url: new URL(path, siteOrigin).toString(),
    changeFrequency: "weekly",
    priority,
  }));

/** The sitemap of the store: its pages, then its categories and its products. */
export function sitemapEntries(siteOrigin: string, paths: SitemapPaths): MetadataRoute.Sitemap {
  return [
    ...weekly(siteOrigin, [paths.home], HOME_PRIORITY),
    ...weekly(siteOrigin, paths.pages, PAGE_PRIORITY),
    ...weekly(siteOrigin, paths.categories, CATEGORY_PRIORITY),
    ...weekly(siteOrigin, paths.products, PRODUCT_PRIORITY),
  ];
}
