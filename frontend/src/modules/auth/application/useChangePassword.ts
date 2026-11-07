import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { authContent } from "../content/auth";
import { authErrorMessage } from "../domain/auth-error";
import {
  type ChangePasswordFormValues,
  changePasswordFormSchema,
} from "../domain/change-password-form";
import { ADMIN_PATHS } from "../domain/routes";
import { sessionAuthApi } from "./session-client";
import { useSessionStore } from "./session-store";

const EMPTY_VALUES: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

/**
 * The form to change the own password. The API renews the session with the change, so it is
 * kept. When the change was required (a temporary password) the person moves on to the panel;
 * when they chose it, they stay and are told it worked.
 */
export function useChangePassword() {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const startSession = useSessionStore((state) => state.start);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const mutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: ChangePasswordFormValues) => {
      // Read before the session is renewed: it is what tells the two cases apart.
      const wasRequired = user?.mustChangePassword ?? false;
      const session = await sessionAuthApi.changePassword({ currentPassword, newPassword });
      return { session, wasRequired };
    },
    onSuccess: ({ session, wasRequired }) => {
      startSession(session);
      if (wasRequired) {
        router.replace(ADMIN_PATHS.products);
      } else {
        form.reset(EMPTY_VALUES);
      }
    },
  });

  const isRequired = mutation.data?.wasRequired ?? user?.mustChangePassword ?? false;

  return {
    form,
    submit: form.handleSubmit((values) => mutation.mutate(values)),
    isRequired,
    // Stays busy after a required change: the page is on its way out and a second click must do nothing.
    isBusy: mutation.isPending || (mutation.isSuccess && isRequired),
    errorMessage: mutation.isError
      ? authErrorMessage(mutation.error, authContent.changePassword.unexpected)
      : null,
    successMessage: mutation.isSuccess && !isRequired ? authContent.changePassword.success : null,
  };
}
