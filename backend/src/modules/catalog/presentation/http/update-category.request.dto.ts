import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsNotEmpty, IsString, IsUUID, ValidateIf } from "class-validator";
import { trimString } from "../../../identity/presentation/http/request-transforms.js";
import type { UpdateCategoryCommand } from "../../application/dto/update-category.command.js";
import { CATEGORY_MESSAGES, isPresent } from "./category-request-rules.js";

/**
 * Changes to a category; only the fields present change. A `null` parent moves it to the root
 * and a blank description removes it; any other `null` is invalid.
 */
export class UpdateCategoryRequestDto implements Omit<UpdateCategoryCommand, "categoryId"> {
  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString({ message: CATEGORY_MESSAGES.name })
  @IsNotEmpty({ message: CATEGORY_MESSAGES.name })
  name?: string;

  @ValidateIf(isPresent)
  @IsString({ message: CATEGORY_MESSAGES.description })
  description?: string;

  @ValidateIf((_dto: object, value: unknown) => value !== undefined && value !== null)
  @IsUUID("all", { message: CATEGORY_MESSAGES.parentId })
  parentId?: string | null;

  @ValidateIf(isPresent)
  @IsInt({ message: CATEGORY_MESSAGES.sortOrder })
  sortOrder?: number;

  @ValidateIf(isPresent)
  @IsBoolean({ message: CATEGORY_MESSAGES.isActive })
  isActive?: boolean;
}
