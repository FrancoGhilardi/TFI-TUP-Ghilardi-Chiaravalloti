import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsNotEmpty, IsString, MaxLength, ValidateIf } from "class-validator";
import type { UpdateUserCommand } from "../../application/dto/update-user.command.js";
import { UserRole } from "../../domain/user-role.js";
import { EMAIL_INPUT_MAX_LENGTH, TOO_LONG_MESSAGE } from "./request-limits.js";
import { trimString } from "./request-transforms.js";

// Only a missing field is left alone; a null one is invalid, not a way to skip it.
const isPresent = (_dto: object, value: unknown) => value !== undefined;

/** Changes to a user; only the fields present change. */
export class UpdateUserRequestDto implements Omit<UpdateUserCommand, "actorId" | "userId"> {
  @ValidateIf(isPresent)
  @Transform(trimString)
  // The format is the domain one (`Email`), the same the database and the seed check.
  @IsString({ message: "Ingresá el email." })
  @IsNotEmpty({ message: "Ingresá el email." })
  @MaxLength(EMAIL_INPUT_MAX_LENGTH, { message: TOO_LONG_MESSAGE })
  email?: string;

  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString({ message: "Ingresá el nombre." })
  @IsNotEmpty({ message: "Ingresá el nombre." })
  name?: string;

  @ValidateIf(isPresent)
  @IsEnum(UserRole, { message: "Elegí un rol válido." })
  role?: UserRole;

  @ValidateIf(isPresent)
  @IsBoolean({ message: "Indicá si el usuario está activo." })
  isActive?: boolean;
}
