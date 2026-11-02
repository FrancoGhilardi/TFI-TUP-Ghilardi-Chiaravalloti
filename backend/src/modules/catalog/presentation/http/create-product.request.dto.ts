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
  registerDecorator,
  ValidateIf,
  type ValidationOptions,
} from "class-validator";
import { trimString } from "../../../identity/presentation/http/request-transforms.js";

// Digits, a dot and up to 2 decimals, as `Money` reads them; never a number, which can lose cents.
const DECIMAL = /^\d{1,10}(\.\d{1,2})?$/;
const DECIMAL_MESSAGE = "tiene que ser un monto con hasta 2 decimales, como 1500.50.";
const DATE_MESSAGE = "tiene que ser una fecha y hora válidas.";

const isPresent = (_dto: object, value: unknown) => value !== undefined;

/** The field may only come when `flag` is true, such as a sale price only on sale. */
function OnlyWith(flag: string, message: string, options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: "onlyWith",
      target: target.constructor,
      propertyName,
      options: { message, ...options },
      validator: {
        validate: (value: unknown, args) =>
          value === undefined || (args?.object as Record<string, unknown>)[flag] === true,
      },
    });
  };
}

/**
 * The `data` field of the new product form. Amounts and lengths in code points are checked
 * by the domain, with their own messages; the slug and the SKU are never received.
 */
export class CreateProductRequestDto {
  @Transform(trimString)
  @IsString({ message: "Ingresá el título." })
  @IsNotEmpty({ message: "Ingresá el título." })
  title!: string;

  @ValidateIf(isPresent)
  @IsString({ message: "La descripción tiene que ser un texto." })
  description?: string;

  @IsString({ message: `El precio ${DECIMAL_MESSAGE}` })
  @Matches(DECIMAL, { message: `El precio ${DECIMAL_MESSAGE}` })
  price!: string;

  @IsBoolean({ message: "Indicá si el producto está en oferta." })
  isOnSale!: boolean;

  @ValidateIf(
    (dto: CreateProductRequestDto, value: unknown) => dto.isOnSale === true || value !== undefined,
  )
  @OnlyWith("isOnSale", "El precio de oferta solo se indica si el producto está en oferta.")
  @IsString({ message: `El precio de oferta ${DECIMAL_MESSAGE}` })
  @Matches(DECIMAL, { message: `El precio de oferta ${DECIMAL_MESSAGE}` })
  salePrice?: string;

  @ValidateIf(isPresent)
  @OnlyWith("isOnSale", "El vencimiento de la oferta solo se indica si el producto está en oferta.")
  @IsISO8601({ strict: true }, { message: `El vencimiento de la oferta ${DATE_MESSAGE}` })
  saleEndsAt?: string;

  @IsInt({ message: "El stock tiene que ser un número entero desde 0." })
  stock!: number;

  @IsBoolean({ message: "Indicá si el producto es destacado." })
  isFeatured!: boolean;

  @IsBoolean({ message: "Indicá si el producto es nuevo." })
  isNew!: boolean;

  @ValidateIf(isPresent)
  @OnlyWith("isNew", "El vencimiento de la novedad solo se indica si el producto es nuevo.")
  @IsISO8601({ strict: true }, { message: `El vencimiento de la novedad ${DATE_MESSAGE}` })
  newUntil?: string;

  @ValidateIf(isPresent)
  @IsInt({ message: "La posición tiene que ser un número entero desde 0." })
  sortOrder?: number;

  @IsBoolean({ message: "Indicá si el producto está activo." })
  isActive!: boolean;

  @IsArray({ message: "Elegí al menos una categoría." })
  @IsUUID("all", { each: true, message: "Elegí categorías válidas." })
  categoryIds!: string[];

  @IsUUID("all", { message: "Elegí una categoría principal válida." })
  primaryCategoryId!: string;

  @ValidateIf(isPresent)
  @IsArray({ message: "Los productos similares tienen que ser una lista." })
  @IsUUID("all", { each: true, message: "Elegí productos similares válidos." })
  relatedProductIds?: string[];

  /** One per image, in the same order; a missing or blank one means none. */
  @ValidateIf(isPresent)
  @IsArray({ message: "Los textos alternativos tienen que ser una lista." })
  @IsString({ each: true, message: "Cada texto alternativo tiene que ser un texto." })
  imageAltTexts?: string[];
}
