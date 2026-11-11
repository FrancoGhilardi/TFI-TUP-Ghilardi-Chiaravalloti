"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type BaseSyntheticEvent, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useUnsavedChangesWarning } from "@/modules/core/hooks/useUnsavedChangesWarning";
import { toast } from "@/modules/core/ui/toast";

import { categoryFormToasts } from "../content/categories";
import { CATEGORIES_PATH } from "../domain/categories-query";
import {
  type CategoryFormValues,
  categoryFormSchema,
  EMPTY_CATEGORY_FORM,
} from "../domain/category-form";
import { hasChanges, toCreateRequest, toUpdateRequest } from "../domain/category-request";
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const initial = options.mode === "edit" ? options.initial : EMPTY_CATEGORY_FORM;
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initial,
    mode: "onTouched",
  });
  const [general, setGeneral] = useState<string | null>(null);
  // Set as soon as a valid form starts to be sent: two submits can both pass the validation.
  const sending = useRef(false);

  const save = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      if (options.mode === "create") {
        await adminCategoriesApi.create(toCreateRequest(values));
      } else {
        await adminCategoriesApi.update(
          options.categoryId,
          toUpdateRequest(values, options.initial),
        );
      }
    },
    // Not waited for: the lists are read again while the person is already on their way back. The
    // category being edited is only marked as stale: reading it now would replace what the form
    // shows while it is still on screen.
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin-categories"],
        predicate: ({ queryKey }) => queryKey[1] !== "detail",
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin-categories", "detail"],
        refetchType: "none",
      });
    },
  });

  const values = useWatch({ control: form.control }) as CategoryFormValues;
  const changed =
    options.mode === "edit" ? hasChanges(values, options.initial) : form.formState.isDirty;
  useUnsavedChangesWarning(changed);

  const send = async (valid: CategoryFormValues) => {
    if (sending.current || (options.mode === "edit" && !changed)) {
      return;
    }
    sending.current = true;
    setGeneral(null);
    try {
      await save.mutateAsync(valid);
    } catch (error) {
      sending.current = false;
      const refused = serverErrorsOf(error);
      let focused = false;
      for (const field of ERROR_FIELD_ORDER) {
        const message = refused.fields[field];
        if (message) {
          form.setError(field, { type: "server", message }, { shouldFocus: !focused });
          focused = true;
        }
      }
      setGeneral(refused.general ?? null);
      toast.error(refused.general ?? categoryFormToasts.failed);
      return;
    }
    // Clean again, so the browser does not warn about leaving a form that was just saved. What is
    // in flight stays so: the page is on its way out and a second submit must send nothing.
    form.reset(valid);
    toast.success(
      options.mode === "create" ? categoryFormToasts.created : categoryFormToasts.updated,
    );
    router.push(CATEGORIES_PATH);
  };

  // Built when the form is submitted, not while rendering: it reads and sets what is in flight.
  const submit = (event?: BaseSyntheticEvent) => form.handleSubmit(send)(event);

  return {
    form,
    /** What is wrong with each field, from the browser's checks and from the server's refusals. */
    errors: form.formState.errors,
    submit,
    /** What the server refused that belongs to no field. */
    general,
    isSaving: save.isPending || save.isSuccess,
    /** There is something to save: always when creating, only if something differs when editing. */
    canSave: options.mode === "create" || changed,
    changed,
  };
}
