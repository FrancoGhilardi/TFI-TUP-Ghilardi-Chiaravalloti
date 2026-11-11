import { type ServerFieldErrors, serverFieldErrors } from "@/modules/core/http";

import { categoryFormErrors } from "../content/categories";
import type { CategoryFormField } from "./category-form";

/** Fields of the form the server can complain about, in the order they appear on the screen. */
export const ERROR_FIELD_ORDER = [
  "name",
  "description",
  "parentId",
  "sortOrder",
] as const satisfies readonly CategoryFormField[];

export type ErrorField = (typeof ERROR_FIELD_ORDER)[number];

export type ServerErrors = ServerFieldErrors<ErrorField>;

/** Fields the API names in `VALIDATION_FAILED`, by their name in the request. */
const FIELD_OF_NAME: Record<string, ErrorField> = {
  name: "name",
  description: "description",
  parentId: "parentId",
  sortOrder: "sortOrder",
};

/** Fields that the API's domain errors are about, by their `code`. */
const FIELD_OF_CODE: Record<string, ErrorField> = {
  INVALID_CATEGORY_NAME: "name",
  INVALID_SLUG: "name",
  CATEGORY_NAME_IN_USE: "name",
  INVALID_DESCRIPTION: "description",
  INVALID_SORT_ORDER: "sortOrder",
  CATEGORY_CYCLE: "parentId",
  PARENT_CATEGORY_UNAVAILABLE: "parentId",
};

/** Where the server's refusal belongs on the form: its fields with its own message, the rest general. */
export function serverErrorsOf(error: unknown): ServerErrors {
  return serverFieldErrors<ErrorField>(error, {
    fieldOfName: FIELD_OF_NAME,
    fieldOfCode: FIELD_OF_CODE,
    fallback: categoryFormErrors.fallback,
  });
}
