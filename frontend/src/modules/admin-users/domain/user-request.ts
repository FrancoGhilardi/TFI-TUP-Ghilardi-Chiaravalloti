import type { UserRole } from "@/modules/auth";

import type { UserFormValues } from "./user-form";

/** `CreateUserRequestDto` of the API. */
export interface CreateUserRequest {
  email: string;
  name: string;
  role: UserRole;
  temporaryPassword: string;
}

/** `UpdateUserRequestDto`: only what changed. */
export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The user to create, from a form that passed its validation. */
export function toCreateRequest(values: UserFormValues): CreateUserRequest {
  return {
    email: values.email.trim(),
    name: values.name.trim(),
    role: values.role as UserRole,
    temporaryPassword: values.temporaryPassword,
  };
}

/**
 * What changed between the form as it opened (`initial`) and as it is now, in the shape the API
 * takes; nothing changed is an empty object. The email is compared without case, as the API
 * stores it in lowercase.
 */
export function toUpdateRequest(
  values: UserFormValues,
  initial: UserFormValues,
): UpdateUserRequest {
  const request: UpdateUserRequest = {};

  if (values.name.trim() !== initial.name.trim()) {
    request.name = values.name.trim();
  }
  if (!sameEmail(values.email, initial.email)) {
    request.email = values.email.trim();
  }
  if (values.role !== initial.role) {
    request.role = values.role as UserRole;
  }
  if (values.isActive !== initial.isActive) {
    request.isActive = values.isActive;
  }

  return request;
}

/** Whether the form differs from how it opened. */
export const hasChanges = (values: UserFormValues, initial: UserFormValues): boolean =>
  Object.keys(toUpdateRequest(values, initial)).length > 0;
