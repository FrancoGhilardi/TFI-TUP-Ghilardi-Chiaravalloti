import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { destinationAfterLogin } from "../domain/post-login-destination";
import { loginErrorMessage } from "../domain/login-error";
import { type LoginFormValues, loginFormSchema } from "../domain/login-form";
import { authApi } from "../infrastructure/auth-api";
import { useSessionStore } from "./session-store";

/**
 * The sign-in form: validates what was typed, signs in, keeps the session and goes to the screen
 * that fits the person (see `destinationAfterLogin`). `next` is where they were heading, if any.
 */
export function useLogin(next: string | undefined) {
  const router = useRouter();
  const startSession = useSessionStore((state) => state.start);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: LoginFormValues) => authApi.login(values),
    onSuccess: (result) => {
      startSession(result);
      router.replace(destinationAfterLogin(result.user, next));
    },
  });

  return {
    form,
    submit: form.handleSubmit((values) => mutation.mutate(values)),
    // Stays busy after success: the page is on its way out and a second click must do nothing.
    isBusy: mutation.isPending || mutation.isSuccess,
    errorMessage: mutation.isError ? loginErrorMessage(mutation.error) : null,
  };
}
