"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type BaseSyntheticEvent, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useSessionUser, useUpdateSessionUser } from "@/modules/auth";
import { useUnsavedChangesWarning } from "@/modules/core/hooks/useUnsavedChangesWarning";
import { toast } from "@/modules/core/ui/toast";

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionUser = useSessionUser();
  const updateSessionUser = useUpdateSessionUser();
  const mode: UserFormMode = options.mode;
  const initial = options.mode === "edit" ? options.initial : EMPTY_USER_FORM;
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema(mode)),
    defaultValues: initial,
    mode: "onTouched",
  });
  const [general, setGeneral] = useState<string | null>(null);
  // Set as soon as a valid form starts to be sent: two submits can both pass the validation.
  const sending = useRef(false);

  const save = useMutation({
    mutationFn: async (request: CreateUserRequest | UpdateUserRequest) => {
      if (options.mode === "create") {
        await adminUsersApi.create(request as CreateUserRequest);
      } else {
        await adminUsersApi.update(options.userId, request);
      }
    },
    // Not waited for: the lists are read again while the person is already on their way back. The
    // user being edited is only marked as stale: reading it now would replace what the form
    // shows while it is still on screen.
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin-users"],
        predicate: ({ queryKey }) => queryKey[1] !== "detail",
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin-users", "detail"],
        refetchType: "none",
      });
    },
  });

  const values = useWatch({ control: form.control }) as UserFormValues;
  const changed =
    options.mode === "edit" ? hasChanges(values, options.initial) : form.formState.isDirty;
  useUnsavedChangesWarning(changed);

  const send = async (valid: UserFormValues) => {
    if (sending.current || (options.mode === "edit" && !changed)) {
      return;
    }
    sending.current = true;
    setGeneral(null);
    const request =
      options.mode === "create" ? toCreateRequest(valid) : toUpdateRequest(valid, options.initial);
    try {
      await save.mutateAsync(request);
    } catch (error) {
      sending.current = false;
      const refused = serverErrorsOf(error, request);
      let focused = false;
      for (const field of ERROR_FIELD_ORDER) {
        const message = refused.fields[field];
        if (message) {
          form.setError(field, { type: "server", message }, { shouldFocus: !focused });
          focused = true;
        }
      }
      setGeneral(refused.general ?? null);
      toast.error(refused.general ?? userFormToasts.failed);
      return;
    }
    if (options.mode === "edit" && sessionUser?.id === options.userId) {
      const { name, email } = request as UpdateUserRequest;
      updateSessionUser({ ...(name && { name }), ...(email && { email: email.toLowerCase() }) });
    }
    // Clean again, so the browser does not warn about leaving a form that was just saved. What is
    // in flight stays so: the page is on its way out and a second submit must send nothing.
    form.reset(valid);
    toast.success(options.mode === "create" ? userFormToasts.created : userFormToasts.updated);
    router.push(USERS_PATH);
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
