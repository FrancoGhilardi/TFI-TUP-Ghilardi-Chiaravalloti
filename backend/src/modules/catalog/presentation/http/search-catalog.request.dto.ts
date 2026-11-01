import { Transform, Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import { limitMessage } from "../../../../shared/presentation/http/page-request.dto.js";
import { IsQueryBoolean } from "../../../../shared/presentation/http/query-boolean.js";
import { queryText } from "../../../../shared/presentation/http/query-transforms.js";
import {
  ProductSort,
  type SearchCatalogQuery,
} from "../../application/dto/search-catalog.query.js";
import { CatalogSettings } from "../../application/settings/catalog-settings.js";
import { DECIMAL } from "./product-request-rules.js";
import { IsSearchText } from "./search-text.js";

const SETTINGS = new CatalogSettings();
const LIMIT_MESSAGE = limitMessage(SETTINGS.maxPageSize);
const CATEGORY_MESSAGE = "Elegí una categoría válida.";
const PAGE_MESSAGE = `La página tiene que ser un número entero entre 1 y ${SETTINGS.maxPage}.`;
const PRICE_MESSAGE = "Escribí un precio válido, como 1500 o 1500.50.";
const SORT_MESSAGE = "Elegí un orden válido.";

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

  /** Only a sale that still runs. */
  @IsQueryBoolean()
  isOnSale?: boolean;

  @IsQueryBoolean()
  inStock?: boolean;

  @Transform(queryText)
  @IsOptional()
  @Matches(DECIMAL, { message: PRICE_MESSAGE })
  minPrice?: string;

  @Transform(queryText)
  @IsOptional()
  @Matches(DECIMAL, { message: PRICE_MESSAGE })
  maxPrice?: string;

  @Transform(queryText)
  @IsOptional()
  @IsEnum(ProductSort, { message: SORT_MESSAGE })
  sort?: ProductSort;

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
