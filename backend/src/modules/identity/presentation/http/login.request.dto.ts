import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { LoginCommand } from "../../application/dto/login.command.js";

const TOO_LONG = "Es demasiado largo.";

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
  @MaxLength(254, { message: TOO_LONG })
  email!: string;

  @IsString({ message: "Ingresá tu contraseña." })
  @IsNotEmpty({ message: "Ingresá tu contraseña." })
  @MaxLength(1024, { message: TOO_LONG })
  password!: string;
}
