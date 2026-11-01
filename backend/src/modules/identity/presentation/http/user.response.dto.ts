import { PageResponseDto } from "../../../../shared/presentation/http/page.response.dto.js";
import type { UserResult } from "../../application/dto/user.result.js";
import { UserRole } from "../../domain/user-role.js";

/** A panel user as the user management shows it; never a password hash. */
export class UserResponseDto implements UserResult {
  id!: string;
  email!: string;
  name!: string;
  role!: UserRole;
  isActive!: boolean;
  mustChangePassword!: boolean;
  lastLoginAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
}

export class UserPageResponseDto extends PageResponseDto {
  items!: UserResponseDto[];
}
