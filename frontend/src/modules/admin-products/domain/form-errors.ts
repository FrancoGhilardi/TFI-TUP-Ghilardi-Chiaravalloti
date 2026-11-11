import { type ServerFieldErrors, serverFieldErrors } from "@/modules/core/http";

import { productFormErrors } from "../content/product-form";

import type { ProductFormField } from "./product-form";

/** Fields of the form the server can complain about, in the order they appear on the screen. */
export const ERROR_FIELD_ORDER = [
  "title",
  "description",
  "price",
  "stock",
  "images",
  "categoryIds",
  "relatedProducts",
  "sortOrder",
  "salePrice",
  "saleEndsAt",
  "newUntil",
] as const satisfies readonly ProductFormField[];

export type ErrorField = (typeof ERROR_FIELD_ORDER)[number];

export type ServerErrors = ServerFieldErrors<ErrorField>;

/** Fields the API names in `VALIDATION_FAILED`, by their name in the request. */
const FIELD_OF_NAME: Record<string, ErrorField> = {
  title: "title",
  description: "description",
  price: "price",
  stock: "stock",
  sortOrder: "sortOrder",
  salePrice: "salePrice",
  saleEndsAt: "saleEndsAt",
  newUntil: "newUntil",
  categoryIds: "categoryIds",
  primaryCategoryId: "categoryIds",
  relatedProductIds: "relatedProducts",
  imageAltTexts: "images",
  images: "images",
};

/** Fields that the API's domain errors are about, by their `code`. */
const FIELD_OF_CODE: Record<string, ErrorField> = {
  INVALID_PRODUCT_TITLE: "title",
  INVALID_SLUG: "title",
  INVALID_DESCRIPTION: "description",
  INVALID_MONEY: "price",
  INVALID_PRICE: "price",
  INVALID_STOCK: "stock",
  INVALID_SORT_ORDER: "sortOrder",
  SALE_PRICE_NOT_LOWER: "salePrice",
  INVALID_SALE_END: "saleEndsAt",
  INVALID_NEW_UNTIL: "newUntil",
  INVALID_CATEGORY_ASSIGNMENT: "categoryIds",
  CATEGORY_UNAVAILABLE: "categoryIds",
  INVALID_RELATED_PRODUCTS: "relatedProducts",
  RELATED_PRODUCT_UNAVAILABLE: "relatedProducts",
  SELF_RELATED_PRODUCT: "relatedProducts",
  INVALID_IMAGE: "images",
  INVALID_IMAGE_COUNT: "images",
};

/**
 * Where the server's refusal belongs on the form: the fields it names (by `VALIDATION_FAILED`'s
 * details or by the error's code) with its own message, and whatever has no field as `general`.
 */
export function serverErrorsOf(error: unknown): ServerErrors {
  return serverFieldErrors<ErrorField>(error, {
    fieldOfName: FIELD_OF_NAME,
    fieldOfCode: FIELD_OF_CODE,
    fallback: productFormErrors.fallback,
  });
}
