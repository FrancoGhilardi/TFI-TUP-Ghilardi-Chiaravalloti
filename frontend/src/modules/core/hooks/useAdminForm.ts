"use client";

import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type BaseSyntheticEvent, useRef, useState } from "react";
import {
  type FieldValues,
  type Path,
  type Resolver,
  type UseFormProps,
  useForm,
  useWatch,
} from "react-hook-form";

import type { ServerFieldErrors } from "@/modules/core/http";
import { useUnsavedChangesWarning } from "@/modules/core/hooks/useUnsavedChangesWarning";
import { toast } from "@/modules/core/ui/toast";

interface AdminFormConfig<Values extends FieldValues, Request, Field extends Path<Values>> {
  mode: "create" | "edit";
  resolver: Resolver<Values>;
  /** How the form opens: empty when creating, the saved entity when editing. */
  initial: UseFormProps<Values>["defaultValues"] & Values;
  /** Whether the values differ from how the form opened. Only asked when editing. */
  hasChanges: (values: Values) => boolean;
  /** What is sent: all of it when creating, only what changed when editing. */
  toRequest: (valid: Values) => Request;
  save: (request: Request, valid: Values) => Promise<void>;
  /** Marks the cached lists as stale. Not waited for: the person is already on their way back. */
  invalidate: (queryClient: QueryClient) => void;
  /** Fields the server can complain about, in the order they appear on the screen. */
  fieldOrder: readonly Field[];
  serverErrorsOf: (error: unknown, request: Request) => ServerFieldErrors<Field>;
  toasts: { created: string; updated: string; failed: string };
  /** The list the person goes back to once saved. */
  listPath: string;
  /** Runs once saved, before leaving the form. */
  onSaved?: (request: Request) => void;
}

/**
 * The form of an admin entity: validates in the browser, sends it, puts the server's refusals
 * next to their fields and, once saved, goes back to the list.
 */
export function useAdminForm<Values extends FieldValues, Request, Field extends Path<Values>>(
  config: AdminFormConfig<Values, Request, Field>,
) {
  const { mode, toasts } = config;
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<Values>({
    resolver: config.resolver,
    defaultValues: config.initial,
    mode: "onTouched",
  });
  const [general, setGeneral] = useState<string | null>(null);
  // Set as soon as a valid form starts to be sent: two submits can both pass the validation.
  const sending = useRef(false);

  const save = useMutation({
    mutationFn: ({ request, valid }: { request: Request; valid: Values }) =>
      config.save(request, valid),
    onSettled: () => config.invalidate(queryClient),
  });

  const values = useWatch({ control: form.control }) as Values;
  const changed = mode === "edit" ? config.hasChanges(values) : form.formState.isDirty;
  useUnsavedChangesWarning(changed);

  const send = async (valid: Values) => {
    if (sending.current || (mode === "edit" && !changed)) {
      return;
    }
    sending.current = true;
    setGeneral(null);
    const request = config.toRequest(valid);
    try {
      await save.mutateAsync({ request, valid });
    } catch (error) {
      sending.current = false;
      const refused = config.serverErrorsOf(error, request);
      let focused = false;
      for (const field of config.fieldOrder) {
        const message = refused.fields[field];
        if (message) {
          form.setError(field, { type: "server", message }, { shouldFocus: !focused });
          focused = true;
        }
      }
      setGeneral(refused.general ?? null);
      toast.error(refused.general ?? toasts.failed);
      return;
    }
    config.onSaved?.(request);
    // Clean again, so the browser does not warn about leaving a form that was just saved. What is
    // in flight stays so: the page is on its way out and a second submit must send nothing.
    form.reset(valid);
    toast.success(mode === "create" ? toasts.created : toasts.updated);
    router.push(config.listPath);
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
    canSave: mode === "create" || changed,
    changed,
  };
}
