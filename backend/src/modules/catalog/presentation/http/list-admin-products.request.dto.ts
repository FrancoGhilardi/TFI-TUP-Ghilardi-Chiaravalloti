import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";
import { RecordStatusFilter, SortDirection } from "../../../../shared/application/pagination.js";
import { PageRequestDto } from "../../../../shared/presentation/http/page-request.dto.js";
import { IsQueryBoolean } from "../../../../shared/presentation/http/query-boolean.js";
import { queryInteger } from "../../../../shared/presentation/http/query-transforms.js";
import { TOO_LONG_MESSAGE } from "../../../identity/presentation/http/request-limits.js";
import { trimString } from "../../../identity/presentation/http/request-transforms.js";
import {
  AdminProductSortField,
  type ListAdminProductsQuery,
} from "../../application/dto/list-admin-products.query.js";
import { STOCK_MAX } from "../../domain/catalog-limits.js";
import { lowerCaseIds } from "./product-request-rules.js";

const STOCK_MESSAGE = `El stock máximo tiene que ser un número entero entre 0 y ${STOCK_MAX}.`;

/** Query string of the products listing; whatever is left out takes the default. */
export class ListAdminProductsRequestDto extends PageRequestDto implements ListAdminProductsQuery {
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
  @Transform(lowerCaseIds)
  @IsUUID("all", { message: "Elegí una categoría válida." })
  categoryId?: string;

  @IsOptional()
  @IsEnum(RecordStatusFilter, { message: "Elegí un estado válido." })
  status?: RecordStatusFilter;

  @IsQueryBoolean()
  isFeatured?: boolean;

  @IsQueryBoolean()
  isOnSale?: boolean;

  @IsQueryBoolean()
  isNew?: boolean;

  @IsOptional()
  // A cleared box filters nothing; it never stands for 0.
  @Transform(queryInteger)
  @IsInt({ message: STOCK_MESSAGE })
  @Min(0, { message: STOCK_MESSAGE })
  @Max(STOCK_MAX, { message: STOCK_MESSAGE })
  maxStock?: number;

  @IsOptional()
  @IsEnum(AdminProductSortField, { message: "Elegí un campo de orden válido." })
  sortBy?: AdminProductSortField;

  /** Without one, descending for the default order and ascending for a field chosen. */
  @IsOptional()
  @IsEnum(SortDirection, { message: "Elegí un orden válido." })
  sortDir?: SortDirection;
}
