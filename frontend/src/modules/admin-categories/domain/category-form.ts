import { z } from "zod";

import {
  categoryFormErrors as errors,
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
  SORT_ORDER_MAX,
} from "../content/categories";
import type { AdminCategoryRow } from "./admin-category";

const length = (text: string) => [...text].length;

const shape = z.object({
  name: z.string(),
  description: z.string(),
  /** Id of the parent category; empty for a root category. */
  parentId: z.string(),
  sortOrder: z.string(),
  isActive: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof shape>;
export type CategoryFormField = keyof CategoryFormValues;

export const EMPTY_CATEGORY_FORM: CategoryFormValues = {
  name: "",
  description: "",
  parentId: "",
  sortOrder: "0",
  isActive: true,
};

/** The rules of the form: what the browser checks before anything is sent. */
export const categoryFormSchema = shape.superRefine((values, context) => {
  const fail = (path: string, message: string) =>
    context.addIssue({ code: "custom", path: [path], message });

  const name = values.name.trim();
  if (name === "") {
    fail("name", errors.name.required);
  } else if (length(name) > NAME_MAX_LENGTH) {
    fail("name", errors.name.tooLong);
  }
  if (length(values.description.trim()) > DESCRIPTION_MAX_LENGTH) {
    fail("description", errors.description.tooLong);
  }
  const position = values.sortOrder.trim();
  if (!/^\d+$/.test(position) || Number(position) > SORT_ORDER_MAX) {
    fail("sortOrder", errors.sortOrder);
  }
});

/** The values a category has when its form opens for editing. */
export function initialValuesOf(category: AdminCategoryRow): CategoryFormValues {
  return {
    name: category.name,
    description: category.description ?? "",
    parentId: category.parent?.id ?? "",
    sortOrder: String(category.sortOrder),
    isActive: category.isActive,
  };
}
