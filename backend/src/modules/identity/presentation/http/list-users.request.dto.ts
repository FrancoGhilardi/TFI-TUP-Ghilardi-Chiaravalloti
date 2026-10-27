import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { RecordStatusFilter, SortDirection } from "../../../../shared/application/pagination.js";
import { PageRequestDto } from "../../../../shared/presentation/http/page-request.dto.js";
import type { ListUsersQuery } from "../../application/dto/list-users.query.js";
import { UserRole } from "../../domain/user-role.js";
import { TOO_LONG_MESSAGE } from "./request-limits.js";
import { trimString } from "./request-transforms.js";

/** Query string of the users listing; whatever is left out takes the default. */
export class ListUsersRequestDto extends PageRequestDto implements ListUsersQuery {
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
}
