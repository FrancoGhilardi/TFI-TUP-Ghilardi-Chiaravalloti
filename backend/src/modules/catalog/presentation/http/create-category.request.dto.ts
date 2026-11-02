import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsNotEmpty, IsString, IsUUID, ValidateIf } from "class-validator";
import { trimString } from "../../../identity/presentation/http/request-transforms.js";
import type { CreateCategoryCommand } from "../../application/dto/create-category.command.js";
import { CATEGORY_MESSAGES, isPresent } from "./category-request-rules.js";

/**
 * A new category. The lengths and the range of the position are checked by the domain, with
 * its own messages; the slug is never received.
 */
export class CreateCategoryRequestDto implements CreateCategoryCommand {
  @Transform(trimString)
  @IsString({ message: CATEGORY_MESSAGES.name })
  @IsNotEmpty({ message: CATEGORY_MESSAGES.name })
  name!: string;

  @ValidateIf(isPresent)
  @IsString({ message: CATEGORY_MESSAGES.description })
  description?: string;

  @ValidateIf(isPresent)
  @IsUUID("all", { message: CATEGORY_MESSAGES.parentId })
  parentId?: string;

  @ValidateIf(isPresent)
  @IsInt({ message: CATEGORY_MESSAGES.sortOrder })
  sortOrder?: number;

  @ValidateIf(isPresent)
  @IsBoolean({ message: CATEGORY_MESSAGES.isActive })
  isActive?: boolean;
}
