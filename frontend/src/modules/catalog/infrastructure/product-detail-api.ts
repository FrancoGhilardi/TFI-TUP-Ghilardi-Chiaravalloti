import { cache } from "react";
import { z } from "zod";

import { publicConfig } from "@/modules/core/config/env";
import { isOptimizableImage } from "@/modules/core/config/images";
import { apiClient, parseResponse } from "@/modules/core/http";

import type { ProductDetail } from "../domain/product-detail";
import { priceText, productCardSchema, toProductCard } from "./product-card-dto";

const PRODUCT_REVALIDATE_SECONDS = 60;

/** `ProductDetailResponseDto` of the API, limited to what the page uses. */
const productDetailSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  price: priceText,
  salePrice: priceText.nullable(),
  isOnSale: z.boolean(),
  stock: z.number().int().min(0),
  images: z
    .array(z.object({ id: z.string(), url: z.string(), altText: z.string().nullable() }))
    .min(1),
  primaryCategory: z.object({ name: z.string(), slug: z.string() }).nullable(),
  relatedProducts: z.array(productCardSchema),
});

/** The product with this slug; a hidden or unknown one is an `ApiError` 404. */
export const getProductDetail = cache(async (slug: string): Promise<ProductDetail> => {
  const body = await apiClient.get<unknown>(`/products/${encodeURIComponent(slug)}`, {
    next: { revalidate: PRODUCT_REVALIDATE_SECONDS },
  });
  const dto = parseResponse(productDetailSchema, body);
  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    description: dto.description?.trim() || null,
    price: dto.price,
    salePrice: dto.salePrice,
    isOnSale: dto.isOnSale,
    stock: dto.stock,
    images: dto.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.altText?.trim() || dto.title,
      optimizable: isOptimizableImage(image.url, publicConfig.storageOrigin),
    })),
    category: dto.primaryCategory,
    related: dto.relatedProducts.map(toProductCard),
  };
});
