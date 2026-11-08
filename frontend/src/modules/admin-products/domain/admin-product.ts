/** What the panel's lists show of a product. */
export interface AdminProductSummary {
  id: string;
  sku: string;
  title: string;
  stock: number;
  isActive: boolean;
  /** Address of the first image, or `null` while it has none ready. */
  thumbnailUrl: string | null;
  updatedAt: Date;
}

/** A product at or below this stock is running out. */
export const LOW_STOCK_MAX = 5;

/** What the products table shows of a product. */
export interface AdminProductRow extends AdminProductSummary {
  slug: string;
  /** Decimal text, such as `"1500.00"`. */
  price: string;
  /** The offer price while an offer is in force. */
  salePrice: string | null;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
  primaryCategory: { id: string; name: string } | null;
  /** When it was given a logical delete; `null` while it is not deleted. */
  deletedAt: Date | null;
}

export type ImageStatus = "PENDING" | "PROCESSED" | "FAILED";

/** An image of a product as the panel reads it. */
export interface AdminProductImage {
  id: string;
  position: number;
  altText: string | null;
  mimeType: string;
  sizeBytes: number | null;
  status: ImageStatus;
  /** Signed link to the original; it expires, so it is read again with every list. */
  previewUrl: string | null;
}

/** A product as the edit form shows it. */
export interface AdminProductDetail {
  id: string;
  sku: string;
  slug: string;
  title: string;
  description: string | null;
  /** Decimal text, such as `"1500.00"`. */
  price: string;
  salePrice: string | null;
  saleEndsAt: Date | null;
  stock: number;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  isNew: boolean;
  newUntil: Date | null;
  primaryCategoryId: string;
  /** The primary one first; hidden or deleted ones included. */
  categories: { id: string; name: string; slug: string }[];
  relatedProducts: { id: string; title: string; sku: string; slug: string }[];
  images: AdminProductImage[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: { id: string; name: string } | null;
  updatedBy: { id: string; name: string } | null;
}
