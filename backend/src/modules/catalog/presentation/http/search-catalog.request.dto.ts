import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { limitMessage } from "../../../../shared/presentation/http/page-request.dto.js";
import { IsQueryBoolean } from "../../../../shared/presentation/http/query-boolean.js";
import { queryText } from "../../../../shared/presentation/http/query-transforms.js";
import type { SearchCatalogQuery } from "../../application/dto/search-catalog.query.js";
import { CatalogSettings } from "../../application/settings/catalog-settings.js";
import { IsSearchText } from "./search-text.js";

const SETTINGS = new CatalogSettings();
const LIMIT_MESSAGE = limitMessage(SETTINGS.maxPageSize);
const CATEGORY_MESSAGE = "Elegí una categoría válida.";
const PAGE_MESSAGE = `La página tiene que ser un número entero entre 1 y ${SETTINGS.maxPage}.`;

/** The store listing in the query string: the first page of 20, of every product, when left out. */
export class SearchCatalogRequestDto implements SearchCatalogQuery {
  @Transform(queryText)
  @IsOptional()
  @IsString({ message: CATEGORY_MESSAGE })
  @MaxLength(120, { message: CATEGORY_MESSAGE })
  categorySlug?: string;

  @Transform(queryText)
  @IsOptional()
  @IsSearchText()
  q?: string;

  @IsQueryBoolean()
  isFeatured?: boolean;

  /** Only a "new" mark that still runs. */
  @IsQueryBoolean()
  isNew?: boolean;

  @Type(() => Number)
  @IsInt({ message: PAGE_MESSAGE })
  @Min(1, { message: PAGE_MESSAGE })
  @Max(SETTINGS.maxPage, { message: PAGE_MESSAGE })
  page = 1;

  @Type(() => Number)
  @IsInt({ message: LIMIT_MESSAGE })
  @Min(1, { message: LIMIT_MESSAGE })
  @Max(SETTINGS.maxPageSize, { message: LIMIT_MESSAGE })
  limit = SETTINGS.defaultPageSize;
}
