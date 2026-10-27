import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import {
  limitMessage,
  PAGE_MESSAGE,
} from "../../../../shared/presentation/http/page-request.dto.js";
import type { SearchCatalogQuery } from "../../application/dto/search-catalog.query.js";
import { CatalogSettings } from "../../application/settings/catalog-settings.js";

const SETTINGS = new CatalogSettings();
const LIMIT_MESSAGE = limitMessage(SETTINGS.maxPageSize);
const CATEGORY_MESSAGE = "Elegí una categoría válida.";

/** The store listing in the query string: the first page of 20 when left out. */
export class SearchCatalogRequestDto implements SearchCatalogQuery {
  // A blank one filters nothing.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() || undefined : value,
  )
  @IsOptional()
  @IsString({ message: CATEGORY_MESSAGE })
  @MaxLength(120, { message: CATEGORY_MESSAGE })
  categorySlug?: string;

  @Type(() => Number)
  @IsInt({ message: PAGE_MESSAGE })
  @Min(1, { message: PAGE_MESSAGE })
  page = 1;

  @Type(() => Number)
  @IsInt({ message: LIMIT_MESSAGE })
  @Min(1, { message: LIMIT_MESSAGE })
  @Max(SETTINGS.maxPageSize, { message: LIMIT_MESSAGE })
  limit = SETTINGS.defaultPageSize;
}
