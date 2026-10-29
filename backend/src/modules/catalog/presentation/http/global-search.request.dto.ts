import { Transform, Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import { trimString } from "../../../identity/presentation/http/request-transforms.js";
import type { GlobalSearchQuery } from "../../application/dto/global-search.query.js";
import { CatalogSettings } from "../../application/settings/catalog-settings.js";
import { IsSearchText } from "./search-text.js";

const SETTINGS = new CatalogSettings();
const LIMIT_MESSAGE = `La cantidad de resultados tiene que ser un número entero entre 1 y ${SETTINGS.searchMaxLimit}.`;

/** The search box in the query string: 5 products and 5 categories when no limit is sent. */
export class GlobalSearchRequestDto implements GlobalSearchQuery {
  @Transform(trimString)
  @IsSearchText()
  q!: string;

  @Type(() => Number)
  @IsInt({ message: LIMIT_MESSAGE })
  @Min(1, { message: LIMIT_MESSAGE })
  @Max(SETTINGS.searchMaxLimit, { message: LIMIT_MESSAGE })
  limit = SETTINGS.searchDefaultLimit;
}
