import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { SortDirection } from "../../../../shared/application/pagination.js";
import { ListRequestDto } from "../../../../shared/presentation/http/list-request.dto.js";
import {
  CategorySortField,
  type ListAdminCategoriesQuery,
} from "../../application/dto/list-admin-categories.query.js";
import { CATEGORY_MESSAGES } from "./category-request-rules.js";

/** Query string of the categories listing; whatever is left out takes the default. */
export class ListAdminCategoriesRequestDto
  extends ListRequestDto
  implements ListAdminCategoriesQuery
{
  @IsOptional()
  @IsUUID("all", { message: CATEGORY_MESSAGES.parentId })
  parentId?: string;

  @IsOptional()
  @IsEnum(CategorySortField, { message: "Elegí un campo de orden válido." })
  sortBy?: CategorySortField;

  @ApiPropertyOptional({ enum: SortDirection, default: SortDirection.ASC })
  @IsEnum(SortDirection, { message: "Elegí un orden válido." })
  sortDir: SortDirection = SortDirection.ASC;
}
