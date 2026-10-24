import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { RequestPasswordResetCommand } from "../../application/dto/request-password-reset.command.js";
import { EMAIL_INPUT_MAX_LENGTH, TOO_LONG_MESSAGE } from "./request-limits.js";

/**
 * The format is not checked: a malformed email gets the same answer as an unknown one, so the
 * response says nothing about which accounts exist.
 */
export class ForgotPasswordRequestDto implements RequestPasswordResetCommand {
  // A space copied along with the address is not part of it.
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Ingresá tu email." })
  @IsNotEmpty({ message: "Ingresá tu email." })
  @MaxLength(EMAIL_INPUT_MAX_LENGTH, { message: TOO_LONG_MESSAGE })
  email!: string;
}
