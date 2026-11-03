import { cache } from "react";
import { z } from "zod";

import { apiClient, type Page, parseResponse } from "@/modules/core/http";

import type { CatalogApiParams } from "../domain/catalog-query";
import type { ProductCard } from "../domain/product-card";
import { productCardSchema, toProductCard } from "./product-card-dto";

const PRODUCTS_REVALIDATE_SECONDS = 60;

const productCardsSchema = z.array(productCardSchema);

const productCardPageSchema = z.object({
  items: productCardsSchema,
  page: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
});

async function getProductCards(path: string, timeoutMs?: number): Promise<ProductCard[]> {
  const body = await apiClient.get<unknown>(path, {
    next: { revalidate: PRODUCTS_REVALIDATE_SECONDS },
    timeoutMs,
  });
  return parseResponse(productCardsSchema, body).map(toProductCard);
}

/** One page of the catalog for the given filters, sort and page. */
export async function searchProducts(params: CatalogApiParams): Promise<Page<ProductCard>> {
  const body = await apiClient.get<unknown>("/products", {
    query: params,
    next: { revalidate: PRODUCTS_REVALIDATE_SECONDS },
  });
  const page = parseResponse(productCardPageSchema, body);
  return { ...page, items: page.items.map(toProductCard) };
}

/** Up to 5 featured products, in store order. */
export const getFeaturedProducts = cache((timeoutMs?: number) =>
  getProductCards("/products/featured", timeoutMs),
);

/** Up to 5 products with a running "new" mark, in store order. */
export const getNewProducts = cache((timeoutMs?: number) =>
  getProductCards("/products/new", timeoutMs),
);
