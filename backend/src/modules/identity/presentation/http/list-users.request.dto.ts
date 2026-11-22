import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { SortDirection } from "../../../../shared/application/pagination.js";
import { ListRequestDto } from "../../../../shared/presentation/http/list-request.dto.js";
import type { ListUsersQuery } from "../../application/dto/list-users.query.js";
import { UserRole } from "../../domain/user-role.js";

/** Query string of the users listing; whatever is left out takes the default. */
export class ListUsersRequestDto extends ListRequestDto implements ListUsersQuery {
  @IsOptional()
  @IsEnum(UserRole, { message: "Elegí un rol válido." })
  role?: UserRole;

  @ApiPropertyOptional({ enum: SortDirection, default: SortDirection.ASC })
  @IsEnum(SortDirection, { message: "Elegí un orden válido." })
  sortDir: SortDirection = SortDirection.ASC;
}
