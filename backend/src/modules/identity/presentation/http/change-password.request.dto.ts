import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { ChangePasswordCommand } from "../../application/dto/change-password.command.js";
import { PASSWORD_INPUT_MAX_LENGTH, TOO_LONG_MESSAGE } from "./request-limits.js";

/**
 * Only shape and size are checked, and neither password is trimmed: the policy for the new
 * one is applied by the use case. The limits keep oversized input away from the hasher.
 */
export class ChangePasswordRequestDto implements Omit<
  ChangePasswordCommand,
  "userId" | "userAgent"
> {
  @IsString({ message: "Ingresá tu contraseña actual." })
  @IsNotEmpty({ message: "Ingresá tu contraseña actual." })
  @MaxLength(PASSWORD_INPUT_MAX_LENGTH, { message: TOO_LONG_MESSAGE })
  currentPassword!: string;

  @IsString({ message: "Ingresá la nueva contraseña." })
  @IsNotEmpty({ message: "Ingresá la nueva contraseña." })
  @MaxLength(PASSWORD_INPUT_MAX_LENGTH, { message: TOO_LONG_MESSAGE })
  newPassword!: string;
}
