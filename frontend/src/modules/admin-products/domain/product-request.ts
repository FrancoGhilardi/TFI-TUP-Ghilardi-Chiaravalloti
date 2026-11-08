import { endOfDayIso } from "./day-input";
import type { ProductFormValues } from "./product-form";
import { parsePriceInput } from "./price-input";

/** `CreateProductRequestDto` of the API: what travels as the `data` part of the creation. */
export interface CreateProductRequest {
  title: string;
  description?: string;
  price: string;
  isOnSale: boolean;
  salePrice?: string;
  saleEndsAt?: string;
  stock: number;
  isFeatured: boolean;
  isNew: boolean;
  newUntil?: string;
  sortOrder: number;
  isActive: boolean;
  categoryIds: string[];
  primaryCategoryId: string;
  relatedProductIds?: string[];
  imageAltTexts?: string[];
}

/** `UpdateProductRequestDto`: only what changed. */
export type UpdateProductRequest = Partial<
  Omit<CreateProductRequest, "imageAltTexts"> & { description: string }
>;

type OffsetOf = (day: string) => number;

const lower = (ids: string[]) => ids.map((id) => id.toLowerCase());

/** The price as the API wants it; text that is not a price is left as typed (it never gets here). */
const priceOf = (text: string): string => {
  const price = parsePriceInput(text);
  return price.ok ? price.value : text.trim();
};

/** The offer block as it is sent when the offer is on. */
function saleOf(values: ProductFormValues, offsetOf: OffsetOf) {
  return {
    isOnSale: true,
    salePrice: priceOf(values.salePrice),
    ...(values.saleEndsAt && {
      saleEndsAt: endOfDayIso(values.saleEndsAt, offsetOf(values.saleEndsAt)),
    }),
  };
}

/** The novelty block as it is sent when the mark is on. */
function newMarkOf(values: ProductFormValues, offsetOf: OffsetOf) {
  return {
    isNew: true,
    ...(values.newUntil && { newUntil: endOfDayIso(values.newUntil, offsetOf(values.newUntil)) }),
  };
}

/** The product to create, from a form that passed its validation. */
export function toCreateRequest(
  values: ProductFormValues,
  offsetOf: OffsetOf,
): CreateProductRequest {
  const description = values.description.trim();
  return {
    title: values.title.trim(),
    ...(description && { description }),
    price: priceOf(values.price),
    stock: Number(values.stock),
    sortOrder: Number(values.sortOrder),
    isActive: values.isActive,
    isFeatured: values.isFeatured,
    ...(values.isOnSale ? saleOf(values, offsetOf) : { isOnSale: false }),
    ...(values.isNew ? newMarkOf(values, offsetOf) : { isNew: false }),
    categoryIds: lower(values.categoryIds),
    primaryCategoryId: values.primaryCategoryId.toLowerCase(),
    ...(values.relatedProducts.length > 0 && {
      relatedProductIds: lower(values.relatedProducts.map(({ id }) => id)),
    }),
    imageAltTexts: values.images.map(({ altText }) => altText.trim()),
  };
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/**
 * What changed between the form as it opened (`initial`) and as it is now, in the shape the API
 * takes: each field alone, the offer and the novelty as a block, the categories as a pair and the
 * related products as a whole. Nothing changed is an empty object.
 */
export function toUpdateRequest(
  values: ProductFormValues,
  initial: ProductFormValues,
  offsetOf: OffsetOf,
): UpdateProductRequest {
  const request: UpdateProductRequest = {};

  if (values.title.trim() !== initial.title.trim()) {
    request.title = values.title.trim();
  }
  if (values.description.trim() !== initial.description.trim()) {
    request.description = values.description.trim();
  }
  if (priceOf(values.price) !== priceOf(initial.price)) {
    request.price = priceOf(values.price);
  }
  if (Number(values.stock) !== Number(initial.stock)) {
    request.stock = Number(values.stock);
  }
  if (Number(values.sortOrder) !== Number(initial.sortOrder)) {
    request.sortOrder = Number(values.sortOrder);
  }
  if (values.isActive !== initial.isActive) {
    request.isActive = values.isActive;
  }
  if (values.isFeatured !== initial.isFeatured) {
    request.isFeatured = values.isFeatured;
  }

  const saleChanged =
    values.isOnSale !== initial.isOnSale ||
    (values.isOnSale &&
      (priceOf(values.salePrice) !== priceOf(initial.salePrice) ||
        values.saleEndsAt !== initial.saleEndsAt));
  if (saleChanged) {
    Object.assign(request, values.isOnSale ? saleOf(values, offsetOf) : { isOnSale: false });
  }

  const newChanged =
    values.isNew !== initial.isNew || (values.isNew && values.newUntil !== initial.newUntil);
  if (newChanged) {
    Object.assign(request, values.isNew ? newMarkOf(values, offsetOf) : { isNew: false });
  }

  if (
    !sameList(lower(values.categoryIds), lower(initial.categoryIds)) ||
    values.primaryCategoryId.toLowerCase() !== initial.primaryCategoryId.toLowerCase()
  ) {
    request.categoryIds = lower(values.categoryIds);
    request.primaryCategoryId = values.primaryCategoryId.toLowerCase();
  }
  const related = values.relatedProducts.map(({ id }) => id);
  if (!sameList(lower(related), lower(initial.relatedProducts.map(({ id }) => id)))) {
    request.relatedProductIds = lower(related);
  }

  return request;
}

/** Whether the form differs from how it opened. */
export const hasChanges = (
  values: ProductFormValues,
  initial: ProductFormValues,
  offsetOf: OffsetOf,
): boolean => Object.keys(toUpdateRequest(values, initial, offsetOf)).length > 0;
