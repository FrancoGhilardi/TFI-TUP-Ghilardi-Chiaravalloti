import type { ImageStatus } from "../../domain/image-status.js";
import type { CategorySummaryResult } from "./admin-category.result.js";

export interface ProductSummaryResult {
  id: string;
  sku: string;
  title: string;
  slug: string;
}

export interface UserSummaryResult {
  id: string;
  name: string;
}

/**
 * An image as the panel shows it, with a temporary link to its original file; `null` when the
 * storage could not sign it, so the rest of the product still shows.
 */
export interface AdminProductImageResult {
  id: string;
  position: number;
  previewUrl: string | null;
  altText: string | null;
  mimeType: string;
  sizeBytes: number | null;
  status: ImageStatus;
  createdAt: Date;
}

/**
 * A product as the panel form shows it. Amounts are decimal text with two decimals, and what
 * the product does not have is `null`, so the shape never changes.
 */
export interface AdminProductDetailResult {
  id: string;
  sku: string;
  title: string;
  slug: string;
  description: string | null;
  price: string;
  salePrice: string | null;
  isOnSale: boolean;
  saleEndsAt: Date | null;
  stock: number;
  isFeatured: boolean;
  isNew: boolean;
  newUntil: Date | null;
  sortOrder: number;
  isActive: boolean;
  primaryCategoryId: string;
  categories: CategorySummaryResult[];
  images: AdminProductImageResult[];
  relatedProducts: ProductSummaryResult[];
  createdBy: UserSummaryResult | null;
  updatedBy: UserSummaryResult | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
