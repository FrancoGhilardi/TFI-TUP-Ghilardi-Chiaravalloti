import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
} from "class-validator";
import { trimString } from "../../../identity/presentation/http/request-transforms.js";
import { DECIMAL, isPresent, OnlyWith, PRODUCT_MESSAGES } from "./product-request-rules.js";

/**
 * Changes to a product; only the fields present change, and a `null` is invalid. A blank
 * description removes it. The sale and the new mark change as a whole, as on creation: with
 * `isOnSale` (and `isNew`) their dates and price come along or not at all. The categories
 * come with their primary one, both or neither. The slug and the SKU are never received.
 */
export class UpdateProductRequestDto {
  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString({ message: PRODUCT_MESSAGES.title })
  @IsNotEmpty({ message: PRODUCT_MESSAGES.title })
  title?: string;

  @ValidateIf(isPresent)
  @IsString({ message: PRODUCT_MESSAGES.description })
  description?: string;

  @ValidateIf(isPresent)
  @IsString({ message: PRODUCT_MESSAGES.price })
  @Matches(DECIMAL, { message: PRODUCT_MESSAGES.price })
  price?: string;

  @ValidateIf(isPresent)
  @IsBoolean({ message: PRODUCT_MESSAGES.isOnSale })
  isOnSale?: boolean;

  @ValidateIf(
    (dto: UpdateProductRequestDto, value: unknown) => dto.isOnSale === true || value !== undefined,
  )
  @OnlyWith("isOnSale", PRODUCT_MESSAGES.salePriceWithoutSale)
  @IsString({ message: PRODUCT_MESSAGES.salePrice })
  @Matches(DECIMAL, { message: PRODUCT_MESSAGES.salePrice })
  salePrice?: string;

  @ValidateIf(isPresent)
  @OnlyWith("isOnSale", PRODUCT_MESSAGES.saleEndsAtWithoutSale)
  @IsISO8601({ strict: true }, { message: PRODUCT_MESSAGES.saleEndsAt })
  saleEndsAt?: string;

  @ValidateIf(isPresent)
  @IsInt({ message: PRODUCT_MESSAGES.stock })
  stock?: number;

  @ValidateIf(isPresent)
  @IsBoolean({ message: PRODUCT_MESSAGES.isFeatured })
  isFeatured?: boolean;

  @ValidateIf(isPresent)
  @IsBoolean({ message: PRODUCT_MESSAGES.isNew })
  isNew?: boolean;

  @ValidateIf(isPresent)
  @OnlyWith("isNew", PRODUCT_MESSAGES.newUntilWithoutNew)
  @IsISO8601({ strict: true }, { message: PRODUCT_MESSAGES.newUntil })
  newUntil?: string;

  @ValidateIf(isPresent)
  @IsInt({ message: PRODUCT_MESSAGES.sortOrder })
  sortOrder?: number;

  @ValidateIf(isPresent)
  @IsBoolean({ message: PRODUCT_MESSAGES.isActive })
  isActive?: boolean;

  @ValidateIf(
    (dto: UpdateProductRequestDto, value: unknown) =>
      value !== undefined || dto.primaryCategoryId !== undefined,
  )
  @IsArray({ message: PRODUCT_MESSAGES.categoryIds })
  @IsUUID("all", { each: true, message: PRODUCT_MESSAGES.categoryId })
  categoryIds?: string[];

  @ValidateIf(
    (dto: UpdateProductRequestDto, value: unknown) =>
      value !== undefined || dto.categoryIds !== undefined,
  )
  @IsUUID("all", { message: PRODUCT_MESSAGES.primaryCategoryId })
  primaryCategoryId?: string;

  @ValidateIf(isPresent)
  @IsArray({ message: PRODUCT_MESSAGES.relatedProductIds })
  @IsUUID("all", { each: true, message: PRODUCT_MESSAGES.relatedProductId })
  relatedProductIds?: string[];
}
