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
 * The `data` field of the new product form. Amounts and lengths in code points are checked
 * by the domain, with their own messages; the slug and the SKU are never received.
 */
export class CreateProductRequestDto {
  @Transform(trimString)
  @IsString({ message: PRODUCT_MESSAGES.title })
  @IsNotEmpty({ message: PRODUCT_MESSAGES.title })
  title!: string;

  @ValidateIf(isPresent)
  @IsString({ message: PRODUCT_MESSAGES.description })
  description?: string;

  @IsString({ message: PRODUCT_MESSAGES.price })
  @Matches(DECIMAL, { message: PRODUCT_MESSAGES.price })
  price!: string;

  @IsBoolean({ message: PRODUCT_MESSAGES.isOnSale })
  isOnSale!: boolean;

  @ValidateIf(
    (dto: CreateProductRequestDto, value: unknown) => dto.isOnSale === true || value !== undefined,
  )
  @OnlyWith("isOnSale", PRODUCT_MESSAGES.salePriceWithoutSale)
  @IsString({ message: PRODUCT_MESSAGES.salePrice })
  @Matches(DECIMAL, { message: PRODUCT_MESSAGES.salePrice })
  salePrice?: string;

  @ValidateIf(isPresent)
  @OnlyWith("isOnSale", PRODUCT_MESSAGES.saleEndsAtWithoutSale)
  @IsISO8601({ strict: true }, { message: PRODUCT_MESSAGES.saleEndsAt })
  saleEndsAt?: string;

  @IsInt({ message: PRODUCT_MESSAGES.stock })
  stock!: number;

  @IsBoolean({ message: PRODUCT_MESSAGES.isFeatured })
  isFeatured!: boolean;

  @IsBoolean({ message: PRODUCT_MESSAGES.isNew })
  isNew!: boolean;

  @ValidateIf(isPresent)
  @OnlyWith("isNew", PRODUCT_MESSAGES.newUntilWithoutNew)
  @IsISO8601({ strict: true }, { message: PRODUCT_MESSAGES.newUntil })
  newUntil?: string;

  @ValidateIf(isPresent)
  @IsInt({ message: PRODUCT_MESSAGES.sortOrder })
  sortOrder?: number;

  @IsBoolean({ message: PRODUCT_MESSAGES.isActive })
  isActive!: boolean;

  @IsArray({ message: PRODUCT_MESSAGES.categoryIds })
  @IsUUID("all", { each: true, message: PRODUCT_MESSAGES.categoryId })
  categoryIds!: string[];

  @IsUUID("all", { message: PRODUCT_MESSAGES.primaryCategoryId })
  primaryCategoryId!: string;

  @ValidateIf(isPresent)
  @IsArray({ message: PRODUCT_MESSAGES.relatedProductIds })
  @IsUUID("all", { each: true, message: PRODUCT_MESSAGES.relatedProductId })
  relatedProductIds?: string[];

  /** One per image, in the same order; a missing or blank one means none. */
  @ValidateIf(isPresent)
  @IsArray({ message: "Los textos alternativos tienen que ser una lista." })
  @IsString({ each: true, message: "Cada texto alternativo tiene que ser un texto." })
  imageAltTexts?: string[];
}
