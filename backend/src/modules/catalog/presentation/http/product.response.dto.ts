import { PageResponseDto } from "../../../../shared/presentation/http/page.response.dto.js";
import type { GlobalSearchResult } from "../../application/dto/global-search.result.js";
import type {
  ProductCardResult,
  ProductImageResult,
} from "../../application/dto/product-card.result.js";
import type { ProductDetailResult } from "../../application/dto/product-detail.result.js";
import { CategorySummaryResponseDto } from "./category.response.dto.js";

/** A processed image as the store shows it, from the public storage. */
export class ProductImageResponseDto implements ProductImageResult {
  id!: string;
  position!: number;
  url!: string;
  altText!: string | null;
  width!: number | null;
  height!: number | null;
}

/** A product in a store listing; a sale or a "new" mark counts only while it runs. */
export class ProductCardResponseDto implements ProductCardResult {
  id!: string;
  slug!: string;
  title!: string;
  /** Decimal text with two decimals, such as "1500.50". */
  price!: string;
  /** The running sale price, or `null` without a running sale. */
  salePrice!: string | null;
  isOnSale!: boolean;
  isNew!: boolean;
  isFeatured!: boolean;
  /** The first image with a public version. */
  image!: ProductImageResponseDto;
  /** The primary category, or `null` while it is hidden from the store. */
  category!: CategorySummaryResponseDto | null;
}

export class ProductCardPageResponseDto extends PageResponseDto {
  items!: ProductCardResponseDto[];
}

/** The page of a product in the store, with up to 4 related products. */
export class ProductDetailResponseDto implements ProductDetailResult {
  id!: string;
  slug!: string;
  title!: string;
  description!: string | null;
  /** Decimal text with two decimals. */
  price!: string;
  salePrice!: string | null;
  isOnSale!: boolean;
  /** When the running sale ends, if it has an end. */
  saleEndsAt!: Date | null;
  stock!: number;
  isFeatured!: boolean;
  isNew!: boolean;
  images!: ProductImageResponseDto[];
  /** `null` while the primary category is hidden from the store. */
  primaryCategory!: CategorySummaryResponseDto | null;
  categories!: CategorySummaryResponseDto[];
  relatedProducts!: ProductCardResponseDto[];
}

/** The visible products and categories that match, each up to the limit asked. */
export class GlobalSearchResponseDto implements GlobalSearchResult {
  products!: ProductCardResponseDto[];
  categories!: CategorySummaryResponseDto[];
}
