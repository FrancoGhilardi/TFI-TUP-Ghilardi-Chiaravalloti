import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { authContent } from "../content/auth";
import { authErrorMessage } from "../domain/auth-error";
import {
  type ForgotPasswordFormValues,
  forgotPasswordFormSchema,
} from "../domain/forgot-password-form";
import { authApi } from "../infrastructure/auth-api";

/** The form to ask for a temporary password: validates the email and sends the request. */
export function useForgotPassword() {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: ({ email }: ForgotPasswordFormValues) => authApi.forgotPassword(email),
  });

  return {
    form,
    submit: form.handleSubmit((values) => mutation.mutate(values)),
    isBusy: mutation.isPending,
    /** Back to the form, with the email still typed so a typo can be fixed. */
    startOver: mutation.reset,
    // The API answers the same whether the email exists or not, and so does the screen.
    isSent: mutation.isSuccess,
    errorMessage: mutation.isError
      ? authErrorMessage(mutation.error, authContent.forgotPassword.unexpected)
      : null,
  };
}
