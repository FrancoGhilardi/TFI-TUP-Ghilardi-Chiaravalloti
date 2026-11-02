import { cache } from "react";
import { z } from "zod";

import { publicConfig } from "@/modules/core/config/env";
import { isOptimizableImage } from "@/modules/core/config/images";
import { DECIMAL_PRICE } from "@/modules/core/formatters/price";
import { apiClient, parseResponse } from "@/modules/core/http";

import type { ProductCard } from "../domain/product-card";

const PRODUCTS_REVALIDATE_SECONDS = 60;

const price = z.string().regex(DECIMAL_PRICE);

/** `ProductCardResponseDto` of the API, limited to what the store uses. */
const productCardSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  price,
  salePrice: price.nullable(),
  isOnSale: z.boolean(),
  isNew: z.boolean(),
  isFeatured: z.boolean(),
  image: z.object({ url: z.string(), altText: z.string().nullable() }),
  category: z.object({ name: z.string(), slug: z.string() }).nullable(),
});

const productCardsSchema = z.array(productCardSchema);

type ProductCardDto = z.infer<typeof productCardSchema>;

function toProductCard(dto: ProductCardDto): ProductCard {
  return {
    ...dto,
    image: {
      url: dto.image.url,
      alt: dto.image.altText?.trim() || dto.title,
      optimizable: isOptimizableImage(dto.image.url, publicConfig.storageOrigin),
    },
  };
}

async function getProductCards(path: string, timeoutMs?: number): Promise<ProductCard[]> {
  const body = await apiClient.get<unknown>(path, {
    next: { revalidate: PRODUCTS_REVALIDATE_SECONDS },
    timeoutMs,
  });
  return parseResponse(productCardsSchema, body).map(toProductCard);
}

/** Up to 5 featured products, in store order. */
export const getFeaturedProducts = cache((timeoutMs?: number) =>
  getProductCards("/products/featured", timeoutMs),
);

/** Up to 5 products with a running "new" mark, in store order. */
export const getNewProducts = cache((timeoutMs?: number) =>
  getProductCards("/products/new", timeoutMs),
);
