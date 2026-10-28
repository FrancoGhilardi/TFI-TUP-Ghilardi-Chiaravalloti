import { Transform, Type } from "class-transformer";
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { trimString } from "../../../identity/presentation/http/request-transforms.js";
import type { GlobalSearchQuery } from "../../application/dto/global-search.query.js";
import { CatalogSettings } from "../../application/settings/catalog-settings.js";

const SETTINGS = new CatalogSettings();
const TEXT_MIN_LENGTH = 2;
const TEXT_MAX_LENGTH = 100;
const TEXT_MESSAGE = `Escribí entre ${TEXT_MIN_LENGTH} y ${TEXT_MAX_LENGTH} caracteres para buscar.`;
const LIMIT_MESSAGE = `La cantidad de resultados tiene que ser un número entero entre 1 y ${SETTINGS.searchMaxLimit}.`;

/** The search box in the query string: 5 products and 5 categories when no limit is sent. */
export class GlobalSearchRequestDto implements GlobalSearchQuery {
  @Transform(trimString)
  @IsString({ message: TEXT_MESSAGE })
  @MinLength(TEXT_MIN_LENGTH, { message: TEXT_MESSAGE })
  @MaxLength(TEXT_MAX_LENGTH, { message: TEXT_MESSAGE })
  q!: string;

  @Type(() => Number)
  @IsInt({ message: LIMIT_MESSAGE })
  @Min(1, { message: LIMIT_MESSAGE })
  @Max(SETTINGS.searchMaxLimit, { message: LIMIT_MESSAGE })
  limit = SETTINGS.searchDefaultLimit;
}
