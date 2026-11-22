"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

import { useAdminForm } from "@/modules/core/hooks/useAdminForm";

import { productFormToasts } from "../content/product-form";
import { localOffsetMinutes } from "../domain/day-input";
import { ERROR_FIELD_ORDER, serverErrorsOf } from "../domain/form-errors";
import {
  EMPTY_PRODUCT_FORM,
  type ProductFormValues,
  productFormSchema,
} from "../domain/product-form";
import {
  type CreateProductRequest,
  hasChanges,
  toCreateRequest,
  toUpdateRequest,
  type UpdateProductRequest,
} from "../domain/product-request";
import { PRODUCTS_PATH } from "../domain/products-query";
import { adminProductsApi } from "../infrastructure/admin-products-client";

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
  const initial = options.mode === "edit" ? options.initial : EMPTY_PRODUCT_FORM;
  const [schema] = useState(() =>
    productFormSchema({
      mode: options.mode,
      now: new Date(),
      offsetOf: localOffsetMinutes,
      initial: options.mode === "edit" ? options.initial : undefined,
    }),
  );
  return useAdminForm({
    mode: options.mode,
    resolver: zodResolver(schema),
    initial,
    hasChanges: (values) =>
      options.mode === "edit" && hasChanges(values, options.initial, localOffsetMinutes),
    toRequest: (values): CreateProductRequest | UpdateProductRequest =>
      options.mode === "create"
        ? toCreateRequest(values, localOffsetMinutes)
        : toUpdateRequest(values, options.initial, localOffsetMinutes),
    save: async (request, values) => {
      if (options.mode === "create") {
        await adminProductsApi.create(
          request as CreateProductRequest,
          values.images.map(({ file }) => file),
        );
      } else {
        await adminProductsApi.update(options.productId, request);
      }
    },
    invalidate: (queryClient) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    fieldOrder: ERROR_FIELD_ORDER,
    serverErrorsOf: (error) => serverErrorsOf(error),
    toasts: productFormToasts,
    listPath: PRODUCTS_PATH,
  });
}
