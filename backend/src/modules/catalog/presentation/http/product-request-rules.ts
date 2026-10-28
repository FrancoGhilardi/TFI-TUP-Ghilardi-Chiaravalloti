import { registerDecorator, type ValidationOptions } from "class-validator";
import { RELATED_PRODUCTS_MESSAGES } from "../../domain/errors/invalid-related-products-error.js";

// Digits, a dot and up to 2 decimals, as `Money` reads them; never a number, which can lose cents.
export const DECIMAL = /^\d{1,10}(\.\d{1,2})?$/;
const DECIMAL_MESSAGE = "tiene que ser un monto con hasta 2 decimales, como 1500.50.";
const DATE_MESSAGE = "tiene que ser una fecha y hora válidas.";

export const PRODUCT_MESSAGES = {
  title: "Ingresá el título.",
  description: "La descripción tiene que ser un texto.",
  price: `El precio ${DECIMAL_MESSAGE}`,
  isOnSale: "Indicá si el producto está en oferta.",
  salePrice: `El precio de oferta ${DECIMAL_MESSAGE}`,
  salePriceWithoutSale: "El precio de oferta solo se indica si el producto está en oferta.",
  saleEndsAt: `El vencimiento de la oferta ${DATE_MESSAGE}`,
  saleEndsAtWithoutSale:
    "El vencimiento de la oferta solo se indica si el producto está en oferta.",
  stock: "El stock tiene que ser un número entero desde 0.",
  isFeatured: "Indicá si el producto es destacado.",
  isNew: "Indicá si el producto es nuevo.",
  newUntil: `El vencimiento de la novedad ${DATE_MESSAGE}`,
  newUntilWithoutNew: "El vencimiento de la novedad solo se indica si el producto es nuevo.",
  sortOrder: "La posición tiene que ser un número entero desde 0.",
  isActive: "Indicá si el producto está activo.",
  categoryIds: "Elegí al menos una categoría.",
  categoryId: "Elegí categorías válidas.",
  primaryCategoryId: "Elegí una categoría principal válida.",
  relatedProductIds: "Los productos similares tienen que ser una lista.",
  relatedProductId: "Elegí productos similares válidos.",
  relatedProductsRepeated: RELATED_PRODUCTS_MESSAGES.duplicated,
  relatedProductsTooMany: RELATED_PRODUCTS_MESSAGES.tooMany,
} as const;

/**
 * Ids in lowercase, as Postgres prints them: the same UUID in another case would get past the
 * checks for repeated ids and for the product itself, and never match a stored one.
 */
export const lowerCaseIds = ({ value }: { value: unknown }): unknown => {
  const lower = (item: unknown) => (typeof item === "string" ? item.toLowerCase() : item);
  return Array.isArray(value) ? value.map(lower) : lower(value);
};

/** Only a missing field is left alone; a null one is invalid, not a way to skip it. */
export const isPresent = (_dto: object, value: unknown) => value !== undefined;

/** The field may only come when `flag` is true, such as a sale price only on sale. */
export function OnlyWith(flag: string, message: string, options?: ValidationOptions) {
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
