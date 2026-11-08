import { ApiError } from "@/modules/core/http";

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

export interface ServerErrors {
  /** The server's message for each field it refused. */
  fields: Partial<Record<ErrorField, string>>;
  /** What could not be tied to a field (and a failure that is not the API's). */
  general?: string;
}

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

/** Splits `relatedProductIds.1` or `imageAltTexts[0]` into the name the API uses for the field. */
const rootOf = (path: string): string => path.split(/[.[]/)[0];

/**
 * Where the server's refusal belongs on the form: the fields it names (by `VALIDATION_FAILED`'s
 * details or by the error's code) with its own message, and whatever has no field as `general`.
 */
export function serverErrorsOf(error: unknown): ServerErrors {
  if (!(error instanceof ApiError)) {
    return { fields: {}, general: productFormErrors.fallback };
  }

  const fields: ServerErrors["fields"] = {};
  const orphans: string[] = [];
  const place = (field: ErrorField | undefined, message: string) => {
    if (!field) {
      orphans.push(message);
    } else if (!fields[field]) {
      fields[field] = message;
    }
  };

  const byField = error.fieldErrors();
  if (Object.keys(byField).length > 0) {
    for (const [path, messages] of Object.entries(byField)) {
      place(FIELD_OF_NAME[rootOf(path)], messages.join(" "));
    }
  } else {
    place(FIELD_OF_CODE[error.code], error.message);
  }

  return orphans.length > 0 ? { fields, general: orphans.join(" ") } : { fields };
}
