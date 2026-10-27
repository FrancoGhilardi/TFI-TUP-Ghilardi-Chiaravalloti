import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { RecordStatusFilter, SortDirection } from "../../../../shared/application/pagination.js";
import { PageRequestDto } from "../../../../shared/presentation/http/page-request.dto.js";
import { TOO_LONG_MESSAGE } from "../../../identity/presentation/http/request-limits.js";
import { trimString } from "../../../identity/presentation/http/request-transforms.js";
import {
  CategorySortField,
  type ListAdminCategoriesQuery,
} from "../../application/dto/list-admin-categories.query.js";
import { CATEGORY_MESSAGES } from "./category-request-rules.js";

/** Query string of the categories listing; whatever is left out takes the default. */
export class ListAdminCategoriesRequestDto
  extends PageRequestDto
  implements ListAdminCategoriesQuery
{
  @IsOptional()
  // Trimmed once here; a blank search searches nothing, as if it were not sent.
  @Transform((params) => {
    const value = trimString(params);
    return value === "" ? undefined : value;
  })
  @IsString({ message: "La búsqueda tiene que ser un texto." })
  @MaxLength(100, { message: TOO_LONG_MESSAGE })
  q?: string;

  @IsOptional()
  @IsUUID("all", { message: CATEGORY_MESSAGES.parentId })
  parentId?: string;

  @IsOptional()
  @IsEnum(RecordStatusFilter, { message: "Elegí un estado válido." })
  status?: RecordStatusFilter;

  @IsOptional()
  @IsEnum(CategorySortField, { message: "Elegí un campo de orden válido." })
  sortBy?: CategorySortField;

  @IsEnum(SortDirection, { message: "Elegí un orden válido." })
  sortDir: SortDirection = SortDirection.ASC;
}
