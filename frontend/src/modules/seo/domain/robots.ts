import type { MetadataRoute } from "next";

/** The panel is not for search engines; the store is open to all of them. */
const PRIVATE_PATHS = ["/admin/"];

export function robotsRules(siteOrigin: string): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: new URL("/sitemap.xml", siteOrigin).toString(),
  };
}
