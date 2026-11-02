import { PageResponseDto } from "../../../../shared/presentation/http/page.response.dto.js";
import type {
  AdminProductDetailResult,
  AdminProductImageResult,
  ProductSummaryResult,
  UserSummaryResult,
} from "../../application/dto/admin-product-detail.result.js";
import type {
  AdminProductListItemResult,
  AdminProductThumbnailResult,
} from "../../application/dto/admin-product-list-item.result.js";
import { ImageStatus } from "../../domain/image-status.js";
import { CategorySummaryResponseDto } from "./category.response.dto.js";

export class ProductSummaryResponseDto implements ProductSummaryResult {
  id!: string;
  sku!: string;
  title!: string;
  slug!: string;
}

export class UserSummaryResponseDto implements UserSummaryResult {
  id!: string;
  name!: string;
}

/** An image as the panel shows it, with a temporary link to its original. */
export class AdminProductImageResponseDto implements AdminProductImageResult {
  id!: string;
  position!: number;
  /** Signed link to the original for 10 minutes; `null` when the storage could not sign it. */
  previewUrl!: string | null;
  altText!: string | null;
  mimeType!: string;
  sizeBytes!: number | null;
  status!: ImageStatus;
  createdAt!: Date;
}

/** The first image of a product: its public version or a temporary link to its original. */
export class AdminProductThumbnailResponseDto implements AdminProductThumbnailResult {
  id!: string;
  url!: string | null;
  altText!: string | null;
}

/** A row of the panel's product list; the sale and the "new" mark are the running ones. */
export class AdminProductListItemResponseDto implements AdminProductListItemResult {
  id!: string;
  sku!: string;
  title!: string;
  slug!: string;
  /** Decimal text with two decimals. */
  price!: string;
  salePrice!: string | null;
  stock!: number;
  isActive!: boolean;
  isFeatured!: boolean;
  isNew!: boolean;
  isOnSale!: boolean;
  primaryCategory!: CategorySummaryResponseDto | null;
  thumbnail!: AdminProductThumbnailResponseDto | null;
  updatedAt!: Date;
  deletedAt!: Date | null;
}

export class AdminProductPageResponseDto extends PageResponseDto {
  items!: AdminProductListItemResponseDto[];
}

/** A product as the panel form shows it, with the sale and "new" mark as stored. */
export class AdminProductDetailResponseDto implements AdminProductDetailResult {
  id!: string;
  sku!: string;
  title!: string;
  slug!: string;
  description!: string | null;
  /** Decimal text with two decimals. */
  price!: string;
  salePrice!: string | null;
  isOnSale!: boolean;
  saleEndsAt!: Date | null;
  stock!: number;
  isFeatured!: boolean;
  isNew!: boolean;
  newUntil!: Date | null;
  sortOrder!: number;
  isActive!: boolean;
  primaryCategoryId!: string;
  /** The primary one first, hidden or deleted ones included. */
  categories!: CategorySummaryResponseDto[];
  images!: AdminProductImageResponseDto[];
  relatedProducts!: ProductSummaryResponseDto[];
  createdBy!: UserSummaryResponseDto | null;
  updatedBy!: UserSummaryResponseDto | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
}
