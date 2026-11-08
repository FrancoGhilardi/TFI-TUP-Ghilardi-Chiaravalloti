"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type BaseSyntheticEvent, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { toast } from "@/modules/core/ui/toast";

import { productFormToasts } from "../content/product-form";
import { localOffsetMinutes } from "../domain/day-input";
import { ERROR_FIELD_ORDER, serverErrorsOf } from "../domain/form-errors";
import {
  EMPTY_PRODUCT_FORM,
  type ProductFormValues,
  productFormSchema,
} from "../domain/product-form";
import { hasChanges, toCreateRequest, toUpdateRequest } from "../domain/product-request";
import { PRODUCTS_PATH } from "../domain/products-query";
import { adminProductsApi } from "../infrastructure/admin-products-client";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

type ProductFormMode =
  | { mode: "create" }
  /** `initial` is how the form opened: what is sent is what differs from it. */
  | { mode: "edit"; productId: string; initial: ProductFormValues };

/**
 * The product form: validates in the browser, sends the product (all of it when creating, only
 * what changed when editing), puts the server's refusals next to their fields and, once saved,
 * goes back to the list.
 */
export function useProductForm(options: ProductFormMode) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const initial = options.mode === "edit" ? options.initial : EMPTY_PRODUCT_FORM;
  const [schema] = useState(() =>
    productFormSchema({
      mode: options.mode,
      now: new Date(),
      offsetOf: localOffsetMinutes,
      initial: options.mode === "edit" ? options.initial : undefined,
    }),
  );
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
    mode: "onTouched",
  });
  const [general, setGeneral] = useState<string | null>(null);
  // Set as soon as a valid form starts to be sent: two submits can both pass the validation.
  const sending = useRef(false);

  const save = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      if (options.mode === "create") {
        await adminProductsApi.create(
          toCreateRequest(values, localOffsetMinutes),
          values.images.map(({ file }) => file),
        );
      } else {
        await adminProductsApi.update(
          options.productId,
          toUpdateRequest(values, options.initial, localOffsetMinutes),
        );
      }
    },
    // Not waited for: the lists are read again while the person is already on their way back.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const values = useWatch({ control: form.control }) as ProductFormValues;
  const changed =
    options.mode === "edit"
      ? hasChanges(values, options.initial, localOffsetMinutes)
      : form.formState.isDirty;
  useUnsavedChangesWarning(changed);

  const send = async (valid: ProductFormValues) => {
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
      toast.error(refused.general ?? productFormToasts.failed);
      return;
    }
    // Clean again, so the browser does not warn about leaving a form that was just saved. What is
    // in flight stays so: the page is on its way out and a second submit must send nothing.
    form.reset(valid);
    toast.success(
      options.mode === "create" ? productFormToasts.created : productFormToasts.updated,
    );
    router.push(PRODUCTS_PATH);
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
