import { getSitemap } from "@/modules/seo";

// Read on request: `next build` must not need the API (the catalog changes while the site is up).
export const dynamic = "force-dynamic";

export default getSitemap;
