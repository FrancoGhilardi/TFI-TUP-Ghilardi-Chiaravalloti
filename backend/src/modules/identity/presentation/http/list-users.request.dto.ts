import { Transform, Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { RecordStatusFilter, SortDirection } from "../../../../shared/application/pagination.js";
import type { ListUsersQuery } from "../../application/dto/list-users.query.js";
import { UserRole } from "../../domain/user-role.js";
import { TOO_LONG_MESSAGE } from "./request-limits.js";
import { trimString } from "./request-transforms.js";

const PAGE_MESSAGE = "La página tiene que ser un número entero desde 1.";
const LIMIT_MESSAGE = "La cantidad por página tiene que ser un número entero entre 1 y 100.";

/** Query string of the users listing; whatever is left out takes the default. */
export class ListUsersRequestDto implements ListUsersQuery {
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
  @IsEnum(UserRole, { message: "Elegí un rol válido." })
  role?: UserRole;

  @IsOptional()
  @IsEnum(RecordStatusFilter, { message: "Elegí un estado válido." })
  status?: RecordStatusFilter;

  @IsEnum(SortDirection, { message: "Elegí un orden válido." })
  sortDir: SortDirection = SortDirection.ASC;

  @Type(() => Number)
  @IsInt({ message: PAGE_MESSAGE })
  @Min(1, { message: PAGE_MESSAGE })
  page = 1;

  @Type(() => Number)
  @IsInt({ message: LIMIT_MESSAGE })
  @Min(1, { message: LIMIT_MESSAGE })
  @Max(100, { message: LIMIT_MESSAGE })
  limit = 20;
}
