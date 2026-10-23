import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { LoginCommand } from "../../application/dto/login.command.js";
import { PASSWORD_INPUT_MAX_LENGTH, TOO_LONG_MESSAGE } from "./request-limits.js";

/**
 * Only shape and size are checked: a login compares the text with the stored hash, so the
 * password policy does not apply, and a malformed email gets the same answer as a wrong one.
 * The limits keep oversized input away from the password hasher.
 */
export class LoginRequestDto implements Omit<LoginCommand, "userAgent"> {
  // A space copied along with the address is not part of it; the password is kept as typed.
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Ingresá tu email." })
  @IsNotEmpty({ message: "Ingresá tu email." })
  @MaxLength(254, { message: TOO_LONG_MESSAGE })
  email!: string;

  @IsString({ message: "Ingresá tu contraseña." })
  @IsNotEmpty({ message: "Ingresá tu contraseña." })
  @MaxLength(PASSWORD_INPUT_MAX_LENGTH, { message: TOO_LONG_MESSAGE })
  password!: string;
}
