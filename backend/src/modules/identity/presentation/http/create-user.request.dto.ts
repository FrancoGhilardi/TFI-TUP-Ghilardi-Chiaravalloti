import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { CreateUserCommand } from "../../application/dto/create-user.command.js";
import { UserRole } from "../../domain/user-role.js";
import {
  EMAIL_INPUT_MAX_LENGTH,
  PASSWORD_INPUT_MAX_LENGTH,
  TOO_LONG_MESSAGE,
} from "./request-limits.js";
import { trimString } from "./request-transforms.js";

/**
 * A new panel user. The name length and the password policy are checked by the domain, in
 * code points, with their own messages.
 */
export class CreateUserRequestDto implements Omit<CreateUserCommand, "actorId"> {
  @Transform(trimString)
  // The format is the domain one (`Email`), the same the database and the seed check.
  @IsString({ message: "Ingresá el email." })
  @IsNotEmpty({ message: "Ingresá el email." })
  @MaxLength(EMAIL_INPUT_MAX_LENGTH, { message: TOO_LONG_MESSAGE })
  email!: string;

  @Transform(trimString)
  @IsString({ message: "Ingresá el nombre." })
  @IsNotEmpty({ message: "Ingresá el nombre." })
  name!: string;

  @IsEnum(UserRole, { message: "Elegí un rol válido." })
  role!: UserRole;

  // Kept as typed: spaces are part of a password.
  @IsString({ message: "Ingresá la contraseña." })
  @IsNotEmpty({ message: "Ingresá la contraseña." })
  @MaxLength(PASSWORD_INPUT_MAX_LENGTH, { message: TOO_LONG_MESSAGE })
  temporaryPassword!: string;
}
