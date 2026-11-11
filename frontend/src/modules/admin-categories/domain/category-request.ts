import type { CategoryFormValues } from "./category-form";

/** `CreateCategoryRequestDto` of the API. */
export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
}

/** `UpdateCategoryRequestDto`: only what changed; `parentId: null` moves it to the root. */
export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

const lower = (id: string) => id.toLowerCase();

/** The category to create, from a form that passed its validation. */
export function toCreateRequest(values: CategoryFormValues): CreateCategoryRequest {
  const description = values.description.trim();
  return {
    name: values.name.trim(),
    ...(description && { description }),
    ...(values.parentId && { parentId: lower(values.parentId) }),
    sortOrder: Number(values.sortOrder),
    isActive: values.isActive,
  };
}

/**
 * What changed between the form as it opened (`initial`) and as it is now, in the shape the API
 * takes. An emptied description is sent as an empty text and no parent as `null` (the root);
 * nothing changed is an empty object.
 */
export function toUpdateRequest(
  values: CategoryFormValues,
  initial: CategoryFormValues,
): UpdateCategoryRequest {
  const request: UpdateCategoryRequest = {};

  if (values.name.trim() !== initial.name.trim()) {
    request.name = values.name.trim();
  }
  if (values.description.trim() !== initial.description.trim()) {
    request.description = values.description.trim();
  }
  if (lower(values.parentId) !== lower(initial.parentId)) {
    request.parentId = values.parentId ? lower(values.parentId) : null;
  }
  if (Number(values.sortOrder) !== Number(initial.sortOrder)) {
    request.sortOrder = Number(values.sortOrder);
  }
  if (values.isActive !== initial.isActive) {
    request.isActive = values.isActive;
  }

  return request;
}

/** Whether the form differs from how it opened. */
export const hasChanges = (values: CategoryFormValues, initial: CategoryFormValues): boolean =>
  Object.keys(toUpdateRequest(values, initial)).length > 0;
