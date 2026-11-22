"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import { useAdminForm } from "@/modules/core/hooks/useAdminForm";

import { categoryFormToasts } from "../content/categories";
import { CATEGORIES_PATH } from "../domain/categories-query";
import {
  type CategoryFormValues,
  categoryFormSchema,
  EMPTY_CATEGORY_FORM,
} from "../domain/category-form";
import {
  type CreateCategoryRequest,
  hasChanges,
  toCreateRequest,
  toUpdateRequest,
  type UpdateCategoryRequest,
} from "../domain/category-request";
import { ERROR_FIELD_ORDER, serverErrorsOf } from "../domain/form-errors";
import { adminCategoriesApi } from "../infrastructure/admin-categories-client";

type CategoryFormMode =
  | { mode: "create" }
  /** `initial` is how the form opened: what is sent is what differs from it. */
  | { mode: "edit"; categoryId: string; initial: CategoryFormValues };

/**
 * The category form: validates in the browser, sends the category (all of it when creating, only
 * what changed when editing), puts the server's refusals next to their fields and, once saved,
 * goes back to the list.
 */
export function useCategoryForm(options: CategoryFormMode) {
  const initial = options.mode === "edit" ? options.initial : EMPTY_CATEGORY_FORM;
  return useAdminForm({
    mode: options.mode,
    resolver: zodResolver(categoryFormSchema),
    initial,
    hasChanges: (values) => options.mode === "edit" && hasChanges(values, options.initial),
    toRequest: (values): CreateCategoryRequest | UpdateCategoryRequest =>
      options.mode === "create"
        ? toCreateRequest(values)
        : toUpdateRequest(values, options.initial),
    save: async (request) => {
      if (options.mode === "create") {
        await adminCategoriesApi.create(request as CreateCategoryRequest);
      } else {
        await adminCategoriesApi.update(options.categoryId, request);
      }
    },
    // The category being edited is only marked as stale: reading it now would replace what the
    // form shows while it is still on screen.
    invalidate: (queryClient) => {
      void queryClient.invalidateQueries({
        queryKey: ["admin-categories"],
        predicate: ({ queryKey }) => queryKey[1] !== "detail",
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin-categories", "detail"],
        refetchType: "none",
      });
    },
    fieldOrder: ERROR_FIELD_ORDER,
    serverErrorsOf: (error) => serverErrorsOf(error),
    toasts: categoryFormToasts,
    listPath: CATEGORIES_PATH,
  });
}
