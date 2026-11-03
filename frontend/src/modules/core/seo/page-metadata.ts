import type { Metadata } from "next";

import { siteConfig } from "../config/site";

export const OPEN_GRAPH_LOCALE = "es_AR";

export interface PageMetadataInput {
  /** Title of the page alone: the site name is added by the template of the root layout. */
  title: string;
  description: string;
  /** Public path of the page, with its query when that belongs to the address. */
  path: string;
  image?: { url: string; alt: string };
  /** Keeps the page out of search results while its links are still followed. */
  noIndex?: boolean;
}

/**
 * The metadata of a store page. A page's `openGraph` replaces the layout's instead of merging
 * with it, so the site name and locale are repeated here.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  noIndex = false,
}: PageMetadataInput): Metadata {
  const images = image ? [image] : undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: OPEN_GRAPH_LOCALE,
      title,
      description,
      url: path,
      images,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images },
    robots: noIndex ? { index: false, follow: true } : undefined,
  };
}
