"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import { useSessionUser, useUpdateSessionUser } from "@/modules/auth";
import { useAdminForm } from "@/modules/core/hooks/useAdminForm";

import { userFormToasts } from "../content/users";
import { ERROR_FIELD_ORDER, serverErrorsOf } from "../domain/form-errors";
import {
  EMPTY_USER_FORM,
  type UserFormMode,
  type UserFormValues,
  userFormSchema,
} from "../domain/user-form";
import {
  type CreateUserRequest,
  hasChanges,
  toCreateRequest,
  toUpdateRequest,
  type UpdateUserRequest,
} from "../domain/user-request";
import { USERS_PATH } from "../domain/users-query";
import { adminUsersApi } from "../infrastructure/admin-users-client";

type UserFormOptions =
  | { mode: "create" }
  /** `initial` is how the form opened: what is sent is what differs from it. */
  | { mode: "edit"; userId: string; initial: UserFormValues };

/**
 * The user form: validates in the browser, sends the user (all of it when creating, only what
 * changed when editing), puts the server's refusals next to their fields and, once saved, goes
 * back to the list. Editing the signed-in user also updates the session's copy of their data.
 */
export function useUserForm(options: UserFormOptions) {
  const sessionUser = useSessionUser();
  const updateSessionUser = useUpdateSessionUser();
  const mode: UserFormMode = options.mode;
  const initial = options.mode === "edit" ? options.initial : EMPTY_USER_FORM;
  return useAdminForm({
    mode,
    resolver: zodResolver(userFormSchema(mode)),
    initial,
    hasChanges: (values) => options.mode === "edit" && hasChanges(values, options.initial),
    toRequest: (values): CreateUserRequest | UpdateUserRequest =>
      options.mode === "create"
        ? toCreateRequest(values)
        : toUpdateRequest(values, options.initial),
    save: async (request) => {
      if (options.mode === "create") {
        await adminUsersApi.create(request as CreateUserRequest);
      } else {
        await adminUsersApi.update(options.userId, request);
      }
    },
    // The user being edited is only marked as stale: reading it now would replace what the form
    // shows while it is still on screen.
    invalidate: (queryClient) => {
      void queryClient.invalidateQueries({
        queryKey: ["admin-users"],
        predicate: ({ queryKey }) => queryKey[1] !== "detail",
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin-users", "detail"],
        refetchType: "none",
      });
    },
    fieldOrder: ERROR_FIELD_ORDER,
    serverErrorsOf,
    toasts: userFormToasts,
    listPath: USERS_PATH,
    // Editing the signed-in user also updates the session's copy of their data.
    onSaved: (request) => {
      if (options.mode === "edit" && sessionUser?.id === options.userId) {
        const { name, email } = request as UpdateUserRequest;
        updateSessionUser({ ...(name && { name }), ...(email && { email: email.toLowerCase() }) });
      }
    },
  });
}
