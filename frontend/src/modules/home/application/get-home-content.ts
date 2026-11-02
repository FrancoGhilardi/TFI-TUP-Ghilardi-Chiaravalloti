import { getFeaturedProducts, getNewProducts, type ProductCard } from "@/modules/catalog";
import { OPTIONAL_READ_TIMEOUT_MS, recoverFromApiError } from "@/modules/core/http";

// Every home section can be left out, so each read waits briefly and an API failure means an
// empty section; the page revalidates and fills it later.

export function getHomeFeatured(): Promise<ProductCard[]> {
  return recoverFromApiError(() => getFeaturedProducts(OPTIONAL_READ_TIMEOUT_MS), []);
}

export function getHomeNewArrivals(): Promise<ProductCard[]> {
  return recoverFromApiError(() => getNewProducts(OPTIONAL_READ_TIMEOUT_MS), []);
}
