import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { RecordStatusFilter } from "../../application/pagination.js";
import { PageRequestDto } from "./page-request.dto.js";
import { TOO_LONG_MESSAGE } from "./request-limits.js";
import { trimString } from "./request-transforms.js";

/** What every panel listing accepts besides the page: a search text and the status of records. */
export class ListRequestDto extends PageRequestDto {
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
  @IsEnum(RecordStatusFilter, { message: "Elegí un estado válido." })
  status?: RecordStatusFilter;
}
