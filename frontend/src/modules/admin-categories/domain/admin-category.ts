/** A category as the panel's list and form read it. */
export interface AdminCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** Its direct parent, or `null` for a root category. */
  parent: { id: string; name: string; slug: string } | null;
  sortOrder: number;
  isActive: boolean;
  /** 0 for a root category. */
  depth: number;
  /** Current products that have it among their categories. */
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
  /** When it was given a logical delete; `null` while it is not deleted. */
  deletedAt: Date | null;
}
