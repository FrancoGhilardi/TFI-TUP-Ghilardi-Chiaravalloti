import { z } from "zod";

import { publicConfig } from "@/modules/core/config/env";
import { isOptimizableImage } from "@/modules/core/config/images";
import { DECIMAL_PRICE } from "@/modules/core/formatters/price";

import type { ProductCard } from "../domain/product-card";

/** A price as the API sends it: decimal text with up to two decimals. */
export const priceText = z.string().regex(DECIMAL_PRICE);

/** `ProductCardResponseDto` of the API, limited to what the store uses. */
export const productCardSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  price: priceText,
  salePrice: priceText.nullable(),
  isOnSale: z.boolean(),
  isNew: z.boolean(),
  isFeatured: z.boolean(),
  image: z.object({ url: z.string(), altText: z.string().nullable() }),
  category: z.object({ name: z.string(), slug: z.string() }).nullable(),
});

type ProductCardDto = z.infer<typeof productCardSchema>;

export function toProductCard(dto: ProductCardDto): ProductCard {
  return {
    ...dto,
    image: {
      url: dto.image.url,
      alt: dto.image.altText?.trim() || dto.title,
      optimizable: isOptimizableImage(dto.image.url, publicConfig.storageOrigin),
    },
  };
}
