import { PageResponseDto } from "../../../../shared/presentation/http/page.response.dto.js";
import type {
  AdminCategoryResult,
  CategorySummaryResult,
} from "../../application/dto/admin-category.result.js";
import type { CategoryTreeResult } from "../../application/dto/category-tree.result.js";

/** The few fields that name a category. */
export class CategorySummaryResponseDto implements CategorySummaryResult {
  id!: string;
  name!: string;
  slug!: string;
}

/** A category of the store menu, with the visible subcategories under it. */
export class CategoryTreeResponseDto implements CategoryTreeResult {
  id!: string;
  name!: string;
  slug!: string;
  description!: string | null;
  children!: CategoryTreeResponseDto[];
}

/** A category as the panel shows it; what it does not have is `null`. */
export class AdminCategoryResponseDto implements AdminCategoryResult {
  id!: string;
  name!: string;
  slug!: string;
  description!: string | null;
  parent!: CategorySummaryResponseDto | null;
  sortOrder!: number;
  isActive!: boolean;
  /** 0 for a root category. */
  depth!: number;
  /** Current products that have it among their categories. */
  productCount!: number;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
}

export class AdminCategoryPageResponseDto extends PageResponseDto {
  items!: AdminCategoryResponseDto[];
}
