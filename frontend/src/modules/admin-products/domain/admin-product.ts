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
